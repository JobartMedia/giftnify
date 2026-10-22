/** Shared delivery rules — used by the creation form and enforced again on the server and in the database. */
export type DeliveryChannel = "WhatsApp" | "SMS" | "Email" | "Link";

const PHONE = /^\+[1-9]\d{7,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normalizePhone = (v: string) => v.replace(/[\s().-]/g, "");

/** Returns an error message, or null when the destination is valid for the channel. */
export function deliveryError(channel: string, contact: string): string | null {
  const c = contact.trim();
  if (channel === "Link") return null;
  if (channel === "Email") {
    if (!c) return "Add the recipient's email address.";
    return EMAIL.test(c) && c.length <= 254 ? null : "Enter a valid email, like name@example.com.";
  }
  if (channel === "WhatsApp" || channel === "SMS") {
    if (!c) return `Add the recipient's phone number for ${channel}.`;
    return PHONE.test(normalizePhone(c)) ? null : "Use the full number with country code, like +234 803 555 0142.";
  }
  return "Choose how to deliver the gift.";
}

export function normalizeContact(channel: string, contact: string) {
  if (channel === "Link") return contact.trim() || null;
  return channel === "Email" ? contact.trim().toLowerCase() : normalizePhone(contact.trim());
}

export function messageVerb(type: string) {
  return type === "video" ? { verb: "Watch", noun: "watched", cta: "Watch your message" }
    : type === "audio" ? { verb: "Listen to", noun: "heard", cta: "Listen to your message" }
    : { verb: "Read", noun: "read", cta: "Read your message" };
}
