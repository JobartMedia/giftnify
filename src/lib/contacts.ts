import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { useMe } from "./auth";

export interface Contact {
  id: string; name: string; phone: string | null; email: string | null;
  occasion: string; occasion_date: string | null;
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
    .filter((c) => c.occasion_date)
    .map((c) => {
      const days = daysUntil(c.occasion_date!);
      return { ...c, days, when: whenLabel(days), initials: initialsOf(c.name), first: c.name.split(" ")[0] ?? c.name };
    })
    .sort((a, b) => a.days - b.days);
  const qc = useQueryClient();
  return { uid, contacts, reminders, loading: uid === undefined || q.isLoading, refresh: () => qc.invalidateQueries({ queryKey: ["contacts"] }) };
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
