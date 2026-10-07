import { loadLedgers, type Student } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/server";

// Roda 1x por dia (vercel.json). Também mantém o projeto do Supabase ativo no plano free.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("students")
    .select("*, teachers(name, email)")
    .eq("active", true)
    .not("email", "is", null);
  if (error) throw error;
  const students = data as (Student & { teachers: { name: string; email: string } })[];

  const { data: sent } = await supabase.from("reminders").select("student_id, credits");
  const alreadySent = new Set((sent ?? []).map((r) => `${r.student_id}:${r.credits}`));
  const ledgers = await loadLedgers(supabase, students.map((s) => s.id));
  const origin = process.env.APP_URL ?? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;

  const results: string[] = [];
  for (const s of students) {
    const { ledger } = ledgers.get(s.id)!;
    const hasUpcoming = ledger.lessons.some((l) => !l.past && l.counts);
    if (ledger.credits === 0 || ledger.remaining > 1 || !hasUpcoming) continue;
    if (alreadySent.has(`${s.id}:${ledger.credits}`)) continue;

    const teacher = s.teachers.name || "sua professora";
    const msg =
      ledger.remaining <= 0
        ? "Seu pacote de aulas acabou."
        : `Falta 1 aula para acabar seu pacote${ledger.coveredUntil ? ` (última em ${formatDate(ledger.coveredUntil)})` : ""}.`;
    try {
      await sendEmail({
        to: s.email!,
        replyTo: s.teachers.email,
        subject: "Seu pacote de aulas está acabando",
        html: `<p>Oi, ${s.name}!</p><p>${msg} Fale com ${teacher} para renovar.</p><p><a href="${origin}/a/${s.slug}">Ver minhas aulas</a></p>`,
      });
      await supabase.from("reminders").insert({ student_id: s.id, credits: ledger.credits });
      results.push(`ok ${s.id}`);
    } catch (e) {
      results.push(`erro ${s.id}: ${(e as Error).message}`);
    }
  }

  return Response.json({ checked: students.length, results });
}
