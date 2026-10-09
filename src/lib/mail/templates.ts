export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function studentLoginUrl() {
  const origin = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3001");
  return new URL("/student", origin).href;
}

function layout(title: string, content: string) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f7f8fa;font-family:Arial,sans-serif;color:#283d39"><div style="max-width:540px;margin:32px auto;padding:36px;background:#fff;border-radius:16px"><p style="color:#3e7163;font-size:23px;font-weight:bold">lessonara.</p><h1 style="font-size:23px">${escapeHtml(title)}</h1>${content}<hr style="border:0;border-top:1px solid #e7ece9;margin-top:32px"><p style="font-size:12px;color:#74827f">Seu aprendizado, um encontro de cada vez.</p></div></body></html>`;
}
const button = () => `<p style="margin:28px 0"><a href="${escapeHtml(studentLoginUrl())}" style="background:#3e7163;color:#fff;padding:13px 20px;border-radius:10px;text-decoration:none">Entrar na área do aluno</a></p>`;

export function welcomeEmail(name: string, teacher: string) {
  const subject = "Boas-vindas ao Lessonara!";
  return { subject, html: layout(subject, `<p>Oi, ${escapeHtml(name)}!</p><p>${escapeHtml(teacher || "Sua professora")} preparou seu espaço de aprendizagem.</p><p>Acompanhe suas aulas, pacotes, materiais e atividades em um só lugar.</p>${button()}<p>Para entrar, informe este email e use o código que enviaremos. Esse endereço de acesso continua funcionando quando você precisar entrar novamente.</p>`), text: `Oi, ${name}! ${teacher || "Sua professora"} preparou seu espaço no Lessonara. Acompanhe aulas, materiais e atividades em ${studentLoginUrl()}. Entre com este email e solicite seu código de acesso.` };
}

export function otpEmail(code: string) {
  return { subject: "Seu código de acesso ao Lessonara", html: layout("Seu código de acesso", `<p>Use este código na página em que você solicitou o acesso:</p><p style="font-size:34px;letter-spacing:8px;font-weight:bold;color:#3e7163">${escapeHtml(code)}</p><p>Ele vale por 10 minutos e pode ser usado uma vez. Não compartilhe este código.</p><p>Se você não solicitou o acesso, ignore este email.</p>`), text: `Seu código de acesso ao Lessonara: ${code}. Válido por 10 minutos, uso único. Não compartilhe. Se não solicitou, ignore.` };
}

export function reminderEmail(name: string, teacher: string, message: string) {
  return { subject: "Seu pacote de aulas está acabando", html: layout("Vamos preparar as próximas aulas?", `<p>Oi, ${escapeHtml(name)}!</p><p>${escapeHtml(message)} Fale com ${escapeHtml(teacher || "sua professora")} para renovar.</p>${button()}`), text: `Oi, ${name}! ${message} Fale com ${teacher || "sua professora"} para renovar. Acompanhe suas aulas em ${studentLoginUrl()}.` };
}
