import { normalizeStudentPhone, phoneCountry, initialPhone } from "./phone";
export const PAYMENT_PIX_KEY = "391.716.918-55";
export const DEFAULT_WHATSAPP_MESSAGE = `Boa tarde amore, tudo bem?\nNão esquece do pix das aulas. 📖\n\n${PAYMENT_PIX_KEY}\n\nNubank 💜`;

export function paymentWhatsAppUrl(phone: string, country?: string) {
 if (!phone.trim()) return `https://wa.me/?text=${encodeURIComponent(DEFAULT_WHATSAPP_MESSAGE)}`;
 try {
  const normalized=normalizeStudentPhone(phone,country?phoneCountry(country):initialPhone(phone).country);
  return `https://wa.me/${normalized.phone!.slice(1)}?text=${encodeURIComponent(DEFAULT_WHATSAPP_MESSAGE)}`;
 } catch { return null; }
}
