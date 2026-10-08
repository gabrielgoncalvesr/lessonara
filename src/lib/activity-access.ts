import type { SupabaseClient } from "@supabase/supabase-js";
export async function studentActivity(supabase:SupabaseClient,slug:string,activityId:string) {
 const student=await supabase.from("students").select("id,teacher_id").eq("slug",slug).maybeSingle();
 if(student.error||!student.data)return null;
 const activity=await supabase.from("activities").select("id,teacher_id,student_id,document_id,due_on,archived_at").eq("id",activityId).eq("student_id",student.data.id).eq("teacher_id",student.data.teacher_id).maybeSingle();
 return activity.error?null:activity.data;
}
