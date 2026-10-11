import "server-only";
import {createAdminClient,requireUser} from "./supabase/server";
import {platformPlan,type PlatformFeature} from "./platform-plans";
import type {SupabaseClient} from "@supabase/supabase-js";
export async function loadTeacherPlan(teacherId:string,client?:SupabaseClient){const db=client??createAdminClient();const row=await db.from("teachers").select("platform_plan").eq("id",teacherId).single();if(row.error||!row.data)throw new Error("Não foi possível verificar o plano desta conta.");return platformPlan(row.data.platform_plan);}
export async function requirePlatformFeature(feature:PlatformFeature){const account=await requireUser();const plan=await loadTeacherPlan(account.userId,account.supabase);if(!plan[feature])throw new Error(`${feature==="emails"?"Emails":"Sala de aula"} está disponível no plano Pro.`);return account;}
