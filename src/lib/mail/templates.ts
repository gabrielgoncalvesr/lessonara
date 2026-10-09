export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function studentLoginUrl(teacherId?:string,slug?:string) {
  const origin = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3001");
  return new URL(teacherId&&slug?`/p/${teacherId}/s/${encodeURIComponent(slug)}`:"/student", origin).href;
}

function layout(title: string, content: string) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f7f8fa;font-family:Arial,sans-serif;color:#283d39"><div style="max-width:540px;margin:32px auto;padding:36px;background:#fff;border-radius:16px"><p style="color:#3e7163;font-size:23px;font-weight:bold">lessonara.</p><h1 style="font-size:23px">${escapeHtml(title)}</h1>${content}<hr style="border:0;border-top:1px solid #e7ece9;margin-top:32px"><p style="font-size:12px;color:#74827f">Seu aprendizado, um encontro de cada vez.</p></div></body></html>`;
}
const button = (teacherId?:string,slug?:string,inviteUrl?:string) => `<p style="margin:28px 0"><a href="${escapeHtml(inviteUrl??studentLoginUrl(teacherId,slug))}" style="background:#3e7163;color:#fff;padding:13px 20px;border-radius:10px;text-decoration:none">Entrar na área do aluno</a></p>`;

export function welcomeEmail(name: string, teacher: string, teacherId?:string,slug?:string,inviteUrl?:string) {
  const subject = "Boas-vindas ao Lessonara!";
  return { subject, html: layout(subject, `<p>Oi, ${escapeHtml(name)}!</p><p>${escapeHtml(teacher || "Seu professor(a)")} preparou seu espaço de aprendizagem.</p><p>Acompanhe suas aulas, pacotes, materiais e atividades em um só lugar.</p>${button(teacherId,slug,inviteUrl)}<p>Seu convite de primeiro acesso vale por 24 horas e é de uso único. Ao ativá-lo, sua sessão dura até 30 dias neste navegador.</p><p>Se o convite expirar, ou quando precisar entrar novamente, <a href="${escapeHtml(studentLoginUrl(teacherId,slug))}">solicite um código de acesso</a>.</p>`), text: `Oi, ${name}! ${teacher || "Seu professor(a)"} preparou seu espaço no Lessonara. Acompanhe aulas, materiais e atividades em ${studentLoginUrl(teacherId,slug)}. Seu convite de primeiro acesso: ${inviteUrl??studentLoginUrl(teacherId,slug)}. Válido por 24 horas, uso único. Após ativar, sua sessão dura até 30 dias. Depois disso, use um código de acesso.` };
}

export function otpEmail(code: string) {
  return { subject: "Seu código de acesso ao Lessonara", html: layout("Seu código de acesso", `<p>Use este código na página em que você solicitou o acesso:</p><p style="font-size:34px;letter-spacing:8px;font-weight:bold;color:#3e7163">${escapeHtml(code)}</p><p>Ele vale por 10 minutos e pode ser usado uma vez. Não compartilhe este código.</p><p>Se você não solicitou o acesso, ignore este email.</p>`), text: `Seu código de acesso ao Lessonara: ${code}. Válido por 10 minutos, uso único. Não compartilhe. Se não solicitou, ignore.` };
}

export function reminderEmail(name: string, teacher: string, message: string,teacherId?:string,slug?:string) {
  return { subject: "Seu pacote de aulas está acabando", html: layout("Vamos renovar seu pacote de aulas?", `<p>Oi, ${escapeHtml(name)}!</p><div style="background:#eef4ef;padding:18px;border-radius:12px;margin:20px 0"><p style="margin:0;font-weight:bold">${escapeHtml(message)}</p></div><p>Para continuar suas aulas, combine a renovação com ${escapeHtml(teacher || "seu professor(a)")}.</p><p>Confira seu histórico e próximos encontros no seu espaço de aprendizagem.</p>${button(teacherId,slug)}`), text: `Oi, ${name}! ${message} Fale com ${teacher || "seu professor(a)"} para renovar. Acompanhe suas aulas em ${studentLoginUrl(teacherId,slug)}.` };
}
