// Public contact details for the homepage CTAs.
// TODO: replace with the real Light Work Live WhatsApp business number.
export const WHATSAPP_NUMBER_E164 = "447000000000"; // no leading +, digits only
export const WHATSAPP_DISPLAY = "+44 7000 000000";
export const WHATSAPP_PREFILL =
  "Hi Light Work Live, I'm interested in traffic-management work.";

export function whatsappHref(message = WHATSAPP_PREFILL) {
  return `https://wa.me/${WHATSAPP_NUMBER_E164}?text=${encodeURIComponent(message)}`;
}
