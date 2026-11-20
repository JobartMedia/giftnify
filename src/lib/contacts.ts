import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Me } from "./api";
import type { PhoneContact } from "@/components/giftnify/contacts/ContactImport";
import { useMe } from "./auth";

export interface Contact {
  id: string; name: string; phone: string | null; email: string | null;
  occasion: string; occasion_date: string | null;
  /** The saved date, or their own Giftnify birthday (year 2000 is a placeholder). */
  remind_date?: string | null;
  on_giftnify?: boolean; date_source?: "saved" | "giftnify" | null; date_label?: string | null;
}
export interface Reminder extends Contact { days: number; when: string; initials: string; first: string }

export const initialsOf = (n: string) => n.split(/\s+/).map((p) => p[0] ?? "").join("").slice(0, 2).toUpperCase();

/** Days until the next yearly occurrence of a date (0 = today). */
export function daysUntil(date: string, now = new Date()) {
  const [, m, d] = date.split("-").map(Number);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), (m ?? 1) - 1, d ?? 1);
  if (next < today) next = new Date(now.getFullYear() + 1, (m ?? 1) - 1, d ?? 1);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}
export function whenLabel(days: number) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days < 14) return "Next week";
  return `In ${Math.round(days / 7)} weeks`;
}

export const saveContact = (c: { name: string; phone?: string | null; email?: string | null; occasion?: string | null; occasion_date?: string | null }) =>
  api<Contact>("/contacts", { body: c });
export const deleteContact = (id: string) => api(`/contacts/${encodeURIComponent(id)}`, { method: "DELETE" });

/** Saved people and their dates — the same list as the website's Occasions page. */
export function useContacts() {
  const { me } = useMe();
  const uid = me === undefined ? undefined : (me?.id ?? null);
  const q = useQuery({
    queryKey: ["contacts", uid],
    enabled: !!uid,
    queryFn: () => api<Contact[]>("/contacts"),
  });
  const contacts = q.data ?? [];
  const reminders: Reminder[] = contacts
    .filter((c) => c.remind_date || c.occasion_date)
    .map((c) => {
      const days = daysUntil((c.remind_date || c.occasion_date)!);
      return { ...c, days, when: whenLabel(days), initials: initialsOf(c.name), first: c.name.split(" ")[0] ?? c.name };
    })
    .sort((a, b) => a.days - b.days);
  const qc = useQueryClient();
  return { uid, contacts, reminders, loading: uid === undefined || q.isLoading, refresh: () => qc.invalidateQueries({ queryKey: ["contacts"] }) };
}

/** Add many people at once (from the phone or a .vcf file). */
export const importContacts = (contacts: PhoneContact[], source: "phone" | "vcard") =>
  api<{ added: number; skipped: number }>("/contacts/import", { body: { contacts, source } });

/** Reminder settings and who can see my birthday. */
export const updateBirthdaySettings = (v: { birthday_visible?: boolean; birthday_reminders?: boolean }) =>
  api<Me>("/me", { method: "PATCH", body: v });

/**
 * Reads the phone's contacts in the Android app (asks permission first).
 * Returns null when permission is refused; undefined when not in the app.
 */
export async function readPhoneContacts(): Promise<PhoneContact[] | null> {
  const { Contacts } = await import("@capacitor-community/contacts");
  const perm = await Contacts.requestPermissions();
  if (perm.contacts !== "granted" && perm.contacts !== "limited") return null;
  const { contacts } = await Contacts.getContacts({ projection: { name: true, phones: true, emails: true, birthday: true } });
  return contacts.map((c) => ({
    name: c.name?.display || [c.name?.given, c.name?.family].filter(Boolean).join(" ") || "",
    phone: c.phones?.find((p) => p.number)?.number ?? null,
    email: c.emails?.find((e) => e.address)?.address ?? null,
    birth_day: c.birthday?.day ?? null,
    birth_month: c.birthday?.month ?? null,
  }));
}

/** Builds a real share link for the chosen delivery channel. */
export function deliveryLink(channel: string, to: string, text: string) {
  const t = encodeURIComponent(text);
  const phone = to.replace(/[^\d+]/g, "");
  if (channel === "WhatsApp") return `https://wa.me/${phone.replace(/^\+/, "")}?text=${t}`;
  if (channel === "SMS") return `sms:${phone}?&body=${t}`;
  if (channel === "Email") return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent("You have a mystery gift 🎁")}&body=${t}`;
  return null;
}
