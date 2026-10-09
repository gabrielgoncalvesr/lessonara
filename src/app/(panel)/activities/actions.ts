"use server";
import {requireConfiguredTeacher} from "@/lib/onboarding";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser,createAdminClient } from "@/lib/supabase/server";
import { validExpiry,validDocumentText,validateDocumentFile } from "@/lib/document-rules";
import { nowInTZ } from "@/lib/dates";
import { ACTIVITY_BUCKET } from "@/lib/activities";
import { studentActivity } from "@/lib/activity-access";
type Result<T=undefined>={ok:true;data:T}|{ok:false;message:string};
const fail=(message:string):{ok:false;message:string}=>({ok:false,message});
function refresh(studentId:string,slug?:string){revalidatePath("/activities");revalidatePath(`/students/${studentId}`);revalidatePath("/documents");revalidatePath(`/student/portal/${studentId}`);if(slug)revalidatePath(`/a/${slug}`);}
export async function assignActivity(input:{studentId:string;documentId:string;title:string;instructions:string;dueOn:string}):Promise<Result>{
 const {supabase,userId}=await requireConfiguredTeacher();let dueOn:string|null;
 try{validDocumentText(input.title,"");dueOn=validExpiry(input.dueOn,nowInTZ().today);if(input.instructions.length>4000)throw new Error("Use instruções de até 4.000 caracteres.");}catch(error){return fail((error as Error).message);}
 const student=await supabase.from("students").select("id,slug").eq("id",input.studentId).eq("teacher_id",userId).maybeSingle();if(student.error||!student.data)return fail("Aluno não encontrado.");
 if(input.documentId){const document=await supabase.from("documents").select("id").eq("id",input.documentId).eq("teacher_id",userId).eq("status","ready").maybeSingle();if(document.error||!document.data)return fail("Documento não encontrado na sua biblioteca.");}
 const {error}=await supabase.from("activities").insert({teacher_id:userId,student_id:input.studentId,document_id:input.documentId||null,title:input.title.trim(),instructions:input.instructions.trim(),due_on:dueOn});if(error)return fail("Não foi possível enviar a atividade.");refresh(input.studentId,student.data.slug);return {ok:true,data:undefined};
}
export async function reviewActivity(id:string,feedback:string,documentId=""):Promise<Result>{
 const {supabase,userId}=await requireUser();if(feedback.length>4000)return fail("Use um comentário de até 4.000 caracteres.");
 const activity=await supabase.from("activities").select("student_id,students(slug),activity_submissions(submitted_at)").eq("id",id).eq("teacher_id",userId).maybeSingle<{student_id:string;students:{slug:string};activity_submissions:{submitted_at:string|null}|{submitted_at:string|null}[]|null}>();
 if(activity.error||!activity.data)return fail("Atividade não encontrada.");
 const deliveries=activity.data.activity_submissions;const delivery=Array.isArray(deliveries)?deliveries[0]:deliveries;
 if(!delivery?.submitted_at)return fail("A atividade ainda não foi entregue.");
 const {error}=await supabase.rpc("review_activity",{p_id:id,p_feedback:feedback.trim(),p_document:documentId||null});if(error)return fail("Não foi possível registrar a conferência.");refresh(activity.data.student_id,activity.data.students.slug);return {ok:true,data:undefined};
}
export async function archiveActivity(id:string,archive:boolean):Promise<Result>{
 const {supabase,userId}=await requireUser();const {data,error}=await supabase.from("activities").update({archived_at:archive?new Date().toISOString():null}).eq("id",id).eq("teacher_id",userId).select("student_id,students(slug)").maybeSingle<{student_id:string;students:{slug:string}}>();if(error||!data)return fail("Não foi possível atualizar a atividade.");refresh(data.student_id,data.students.slug);return {ok:true,data:undefined};
}
export async function beginActivitySubmission(slug:string,activityId:string,input:{fileName:string;byteSize:number}):Promise<Result<{id:string;path:string;token:string;mimeType:string}>>{
 let file;try{file=validateDocumentFile(input.fileName,input.byteSize);}catch(error){return fail((error as Error).message);}
 const supabase=createAdminClient();const activity=await studentActivity(supabase,slug,activityId);if(!activity||activity.archived_at)return fail("Atividade indisponível para entrega.");
 const id=randomUUID();const path=`${activity.teacher_id}/${id}/file.${file.extension}`;
 const reserved=await supabase.rpc("reserve_activity_submission",{p_id:id,p_activity_id:activity.id,p_teacher_id:activity.teacher_id,p_student_id:activity.student_id,p_file_name:input.fileName,p_storage_path:path,p_mime_type:file.mimeType,p_byte_size:input.byteSize});
 if(reserved.error)return fail(reserved.error.code==="23505"?"Já existe uma entrega ou envio incompleto nesta atividade.":reserved.error.message.includes("armazenamento")?"O espaço de arquivos da professora está cheio. Avise sua professora.":"Não foi possível preparar a entrega.");
 const signed=await supabase.storage.from(ACTIVITY_BUCKET).createSignedUploadUrl(path);if(signed.error||!signed.data){await supabase.from("activity_submissions").delete().eq("id",id).eq("activity_id",activity.id).eq("status","uploading");return fail("Não foi possível preparar o envio.");}
 return {ok:true,data:{id,path,token:signed.data.token,mimeType:file.mimeType}};
}
export async function finishActivitySubmission(slug:string,activityId:string,submissionId:string,note:string):Promise<Result>{
 if(note.length>4000)return fail("Use observações de até 4.000 caracteres.");const supabase=createAdminClient();const activity=await studentActivity(supabase,slug,activityId);if(!activity||activity.archived_at)return fail("Atividade indisponível.");
 const {data:submission,error}=await supabase.from("activity_submissions").select("storage_path,byte_size,mime_type").eq("id",submissionId).eq("activity_id",activity.id).eq("student_id",activity.student_id).eq("teacher_id",activity.teacher_id).eq("status","uploading").maybeSingle();if(error||!submission)return fail("Envio não encontrado ou já concluído.");
 const info=await supabase.storage.from(ACTIVITY_BUCKET).info(submission.storage_path);if(info.error||info.data?.size!==submission.byte_size||info.data.contentType!==submission.mime_type)return fail("Não foi possível confirmar o arquivo enviado.");
 const completed=await supabase.rpc("complete_activity_submission",{p_submission_id:submissionId,p_activity_id:activity.id,p_teacher_id:activity.teacher_id,p_student_id:activity.student_id,p_note:note.trim()});if(completed.error)return fail("Não foi possível concluir a entrega. A atividade pode ter sido arquivada.");refresh(activity.student_id,slug);return {ok:true,data:undefined};
}
export async function cancelActivitySubmission(slug:string,activityId:string):Promise<Result>{
 const supabase=createAdminClient();const activity=await studentActivity(supabase,slug,activityId);if(!activity)return fail("Atividade não encontrada.");
 const {data:submission,error}=await supabase.from("activity_submissions").select("id,storage_path,status").eq("activity_id",activity.id).eq("teacher_id",activity.teacher_id).eq("student_id",activity.student_id).in("status",["uploading","deleting"]).is("submitted_at",null).maybeSingle();if(error||!submission)return fail("Nenhum envio incompleto encontrado.");
 const locked=await supabase.from("activity_submissions").update({status:"deleting"}).eq("id",submission.id).eq("status",submission.status).is("submitted_at",null).select("id").maybeSingle();if(locked.error||!locked.data)return fail("O envio mudou. Atualize a página.");
 const removed=await supabase.storage.from(ACTIVITY_BUCKET).remove([submission.storage_path]);if(removed.error)return fail("Não foi possível descartar o envio incompleto.");const deleted=await supabase.from("activity_submissions").delete().eq("id",submission.id).eq("status","deleting").is("submitted_at",null);if(deleted.error)return fail("Tente novamente para concluir a limpeza do envio.");refresh(activity.student_id,slug);return {ok:true,data:undefined};
}
export async function removeSubmissionFile(id:string):Promise<Result>{
 const {supabase,userId}=await requireUser();const {data:submission,error}=await supabase.from("activity_submissions").select("id,activity_id,student_id,status,storage_path,submitted_at").eq("id",id).eq("teacher_id",userId).maybeSingle();if(error||!submission||submission.status==="deleted")return fail("Arquivo não encontrado.");
 const admin=createAdminClient();const locked=await admin.from("activity_submissions").update({status:"deleting"}).eq("id",id).eq("teacher_id",userId).eq("status",submission.status).select("id").maybeSingle();if(locked.error||!locked.data)return fail("O arquivo mudou. Atualize a página.");
 const removed=await admin.storage.from(ACTIVITY_BUCKET).remove([submission.storage_path]);if(removed.error){await admin.from("activity_submissions").update({status:submission.status}).eq("id",id).eq("teacher_id",userId);return fail("Não foi possível remover o arquivo.");}
 const result=!submission.submitted_at?await admin.from("activity_submissions").delete().eq("id",id).eq("teacher_id",userId):await admin.from("activity_submissions").update({status:"deleted"}).eq("id",id).eq("teacher_id",userId);
 const student=await supabase.from("students").select("slug").eq("id",submission.student_id).eq("teacher_id",userId).maybeSingle();refresh(submission.student_id,student.data?.slug);if(result.error)return fail("O arquivo foi removido. Tente novamente para concluir o registro.");return {ok:true,data:undefined};
}
