import { Suspense } from "react";
import PanelLoading from "../loading";
import { TeacherActivities } from "@/components/teacher-activities";
import { loadActivities,type ActivityDocument } from "@/lib/activities";
import { requireUser } from "@/lib/supabase/server";
import { nowInTZ } from "@/lib/dates";
export default function ActivitiesPage(){return <Suspense fallback={<PanelLoading/>}><Content/></Suspense>;}
async function Content(){
 const {supabase,userId}=await requireUser();const [loaded,documents,students]=await Promise.all([loadActivities(supabase,userId),supabase.from("documents").select("id,title,file_name").eq("teacher_id",userId).eq("status","ready").order("title").returns<ActivityDocument[]>(),supabase.from("students").select("id,name,active").eq("teacher_id",userId).order("name")]);
 if(students.error)throw students.error;
 return <main><div className="page-heading"><div><p className="eyebrow">UM EXERCÍCIO, UM NOVO PASSO</p><h1>Atividades</h1><p className="page-description">Envie exercícios, acompanhe prazos e confira as entregas dos alunos.</p></div></div><TeacherActivities activities={loaded.activities} documents={documents.data??[]} students={students.data??[]} today={nowInTZ().today} ready={loaded.ready}/></main>;
}
