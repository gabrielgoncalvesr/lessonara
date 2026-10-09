"use server";
import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { CHALLENGE_COOKIE, STUDENT_COOKIE, startStudentSession, studentCookieOptions } from "@/lib/student-access";
import { fingerprint, hashSession } from "@/lib/mail/crypto";
import { enqueueOtp, processEmails } from "@/lib/mail/outbox";

export type StudentLoginState = { phase: "email" | "code" | "profile"; message?: string; error?: string; profiles?: {id:string;name:string;teacherName:string}[] };
const generic = "Se este email estiver cadastrado, você receberá um código. Confira também a pasta de spam.";
export async function requestStudentCode(_previous: StudentLoginState, form: FormData): Promise<StudentLoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { phase: "email", error: "Informe um email válido." };
  const jar = await cookies();
  const db = createAdminClient();
  const id = randomUUID();
  // O IP só é confiável pelo header sobrescrito pela Vercel; não aceita x-forwarded-for arbitrário.
  const ip = process.env.VERCEL ? (await headers()).get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? "unknown" : "local";
  try {
    const allowed = await db.rpc("allow_student_auth", { p_keys: [`request/ip/${fingerprint(ip)}`, `request/email/${fingerprint(email)}`, `request/cooldown/${fingerprint(email)}`, "request/global"], p_limits: [20, 5, 1, 100], p_seconds: [3600, 3600, 60, 3600] });
    if (allowed.error) throw new Error("rate_limit_unavailable");
    if (!allowed.data) return { phase: "email", error: "Aguarde um minuto antes de pedir outro código. Se continuar, tente mais tarde." };
    const old = jar.get(CHALLENGE_COOKIE)?.value;
    if (old) await db.from("student_auth_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", old);
    // Nova solicitação invalida códigos anteriores do mesmo email e seus retries.
    const invalidated = await db.from("student_auth_challenges").update({ consumed_at: new Date().toISOString() }).eq("email", email).is("consumed_at", null);
    if (invalidated.error) throw new Error("challenge_unavailable");
    const student = await db.from("students").select("id").eq("email", email).eq("active", true).limit(1);
    if (student.error) throw new Error("student_lookup_failed");
    const pending = await db.from("student_auth_challenges").insert({ id, email, auth_user_id: null });
    if (pending.error) throw new Error("challenge_write_failed");
    jar.set(CHALLENGE_COOKIE, id, { ...studentCookieOptions, maxAge: 600 });
    // A resposta não depende do tempo de geração/envio: evita enumeração por latência do provedor.
    if (student.data?.length) after(async () => {
      try {
        const fresh = await db.from("student_auth_challenges").select("id").eq("id", id).is("consumed_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
        if (fresh.error || !fresh.data) return;
        const created = await db.auth.admin.createUser({ email, app_metadata: { role: "student" }, email_confirm: false });
        if (created.error && !["email_exists", "user_already_exists"].includes(created.error.code ?? "")) throw new Error("auth_setup_failed");
        const generated = await db.auth.admin.generateLink({ type: "magiclink", email });
        if (generated.error || !generated.data.properties.email_otp || !generated.data.user) throw new Error("otp_generation_failed");
        const linked = await db.from("student_auth_challenges").update({ auth_user_id: generated.data.user.id }).eq("id", id).is("consumed_at", null).gt("expires_at", new Date().toISOString()).select("id").maybeSingle();
        if (linked.error) throw new Error("challenge_update_failed");
        if (!linked.data) return;
        const job = await enqueueOtp(email, generated.data.properties.email_otp, id);
        await processEmails(job);
      } catch { console.error("student_code_delivery_failed"); }
    });
    return { phase: "code", message: generic };
  } catch {
    // Não revela existência de cadastros nem detalhes do provedor.
    console.error("student_code_request_failed");
    jar.set(CHALLENGE_COOKIE, id, { ...studentCookieOptions, maxAge: 600 });
    return { phase: "code", message: generic };
  }
}

export async function verifyStudentCode(_previous: StudentLoginState, form: FormData): Promise<StudentLoginState> {
  const code = String(form.get("code") ?? "").trim();
  const fail = { phase: "code" as const, error: "Código inválido ou expirado. Confira o código ou solicite outro." };
  if (!/^\d{6,8}$/.test(code)) return fail;
  const id = (await cookies()).get(CHALLENGE_COOKIE)?.value;
  if (!id || !/^[a-f\d-]{36}$/i.test(id)) return fail;
  const db = createAdminClient();
  const attempt = await db.rpc("attempt_student_code", { p_id: id });
  if (attempt.error) return { phase: "code", error: "Não foi possível conferir o código agora. Tente novamente." };
  const challenge = attempt.data?.[0] as { email: string; auth_user_id: string | null } | undefined;
  if (!challenge?.auth_user_id) return fail;
  // Auth valida o OTP e seu uso único. Tokens Supabase nunca vão para o navegador do aluno.
  const client = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const verified = await client.auth.verifyOtp({ email: challenge.email, token: code, type: "email" });
  if (verified.error || verified.data.user?.id !== challenge.auth_user_id || !verified.data.user.email_confirmed_at || verified.data.user.email?.toLowerCase() !== challenge.email) return fail;
  const confirmation = await db.from("student_auth_challenges").update({verified_at:new Date().toISOString()}).eq("id",id).eq("auth_user_id",verified.data.user.id).is("consumed_at",null).gt("expires_at",new Date().toISOString()).select("id").maybeSingle();
  if(confirmation.error||!confirmation.data){await client.auth.signOut({scope:"local"});return fail;}
  const rows=await db.from("students").select("id,name,teachers(name)").eq("email",challenge.email).eq("active",true).order("name");
  // Tokens temporários do Auth são descartados; o cookie estudantil tem escopo próprio.
  await client.auth.signOut({scope:"local"});
  if(rows.error)return {phase:"code",error:"Não foi possível abrir sua área agora. Solicite um novo código."};
  const profiles=(rows.data??[]) as unknown as {id:string;name:string;teachers:{name:string}}[];
  if(!profiles.length)return fail;
  if(profiles.length>1)return {phase:"profile",profiles:profiles.map(profile=>({id:profile.id,name:profile.name,teacherName:profile.teachers.name}))};
  if(!await startStudentSession(id,verified.data.user.id,profiles[0].id))return fail;
  redirect("/student");
}

export async function studentSignOut() {
  const jar = await cookies();
  const value = jar.get(STUDENT_COOKIE)?.value;
  if (value) {
    const { error } = await createAdminClient().from("student_sessions").delete().eq("token_hash", hashSession(value));
    if (error) throw new Error("Não foi possível encerrar sua sessão. Tente novamente.");
  }
  jar.delete(STUDENT_COOKIE);
  jar.delete(CHALLENGE_COOKIE);
  redirect("/student/login");
}

export async function chooseStudentProfile(_previous:StudentLoginState,form:FormData):Promise<StudentLoginState>{
 const id=(await cookies()).get(CHALLENGE_COOKIE)?.value;const studentId=String(form.get("studentId")??"");
 const fail={phase:"profile" as const,error:"O acesso expirou ou esse perfil não está disponível. Solicite um novo código."};
 if(!id||!/^[a-f\d-]{36}$/i.test(id)||!/^[a-f\d-]{36}$/i.test(studentId))return fail;
 const challenge=await createAdminClient().from("student_auth_challenges").select("auth_user_id").eq("id",id).not("verified_at","is",null).is("consumed_at",null).gt("expires_at",new Date().toISOString()).maybeSingle();
 if(challenge.error||!challenge.data?.auth_user_id)return fail;
 if(!await startStudentSession(id,challenge.data.auth_user_id,studentId))return fail;
 redirect("/student");
}
