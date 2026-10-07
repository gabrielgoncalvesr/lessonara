export const PAYMENT_PIX_KEY = "391.716.918-55";
export const DEFAULT_WHATSAPP_MESSAGE = `Boa tarde amore, tudo bem?\nNão esquece do pix das aulas. 📖\n\n${PAYMENT_PIX_KEY}\n\nNubank 💜`;

export function paymentWhatsAppUrl(phone: string) {
  const raw = phone.trim();
  if (!raw) return `https://wa.me/?text=${encodeURIComponent(DEFAULT_WHATSAPP_MESSAGE)}`;
  let digits = raw.replace(/\D/g, "");
  if (!raw.startsWith("+") && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
  if (!/^\d{10,15}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(DEFAULT_WHATSAPP_MESSAGE)}`;
}
