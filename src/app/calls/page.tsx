import {Suspense} from "react";
import {createClient} from "@/lib/supabase/server";
import {loadTeacherOverview} from "@/lib/teacher-overview";
import {loadTeacherPlan} from "@/lib/platform-plan-server";
import {CallLogin} from "@/components/call-login";
import {CallsHome} from "@/components/calls-home";
export const metadata={title:"Chamadas · Lessonara"};
async function Calls(){const db=await createClient();const {data}=await db.auth.getClaims();if(!data?.claims)return <CallLogin/>;const owner=await db.from("teachers").select("id").eq("id",data.claims.sub).maybeSingle();if(!owner.data)return <CallLogin/>;const plan=await loadTeacherPlan(owner.data.id,db);const overview=await loadTeacherOverview(true);return <CallsHome name={overview.teacherName} enabled={plan.classroom} today={overview.today} lessons={overview.calendarLessons.filter(l=>l.date>=overview.today&&l.classroomHref&&!['desmarcada','falta','feriado'].includes(l.status)).map(l=>({id:l.id,date:l.date,time:l.time,name:l.name,href:l.classroomHref!}))}/>;}
export default function Page(){return <Suspense fallback={<main className="classroom-state">Carregando chamadas…</main>}><Calls/></Suspense>;}
