import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Avatar, Btn, Card, Chip, Field, PageHeader } from "@/components/giftnify/ui";
import { Icon3D } from "@/components/giftnify/Icon3D";
import { ApiError } from "@/lib/api";
import { useContacts, initialsOf, saveContact, deleteContact } from "@/lib/contacts";
import { useContent } from "@/lib/content";

export const Route = createFileRoute("/occasions")({
  head: () => ({
    meta: [
      { title: "Occasion reminders — Giftnify" },
      { name: "description", content: "Save the people you love and never miss a birthday or anniversary." },
      { property: "og:title", content: "Occasion reminders — Giftnify" },
      { property: "og:description", content: "Save the people you love and never miss a birthday or anniversary." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Occasions,
});

function Occasions() {
  const [tab, setTab] = useState("Upcoming");
  const { uid, contacts, reminders, loading, refresh } = useContacts();
  const { occasions } = useContent();
  const [form, setForm] = useState({ name: "", phone: "", email: "", occasion: "Birthday", date: "" });
  const [adding, setAdding] = useState(false);

  const shown = reminders.filter((r) => (tab === "Today" ? r.days === 0 : tab === "This Week" ? r.days < 7 : true));
  const featured = reminders[0];
  const undated = contacts.filter((c) => !c.occasion_date);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!uid || form.name.trim().length < 1) return;
    try {
      await saveContact({ name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null, occasion: form.occasion, occasion_date: form.date || null });
    } catch (err) { toast.error(err instanceof ApiError ? err.message : "Couldn't save contact"); return; }
    toast.success("Saved — we'll remind you");
    setForm({ name: "", phone: "", email: "", occasion: "Birthday", date: "" }); setAdding(false); refresh();
  }
  async function remove(id: string) {
    await deleteContact(id).catch(() => toast.error("Couldn't remove contact")); refresh();
  }

  return (
    <AppShell>
      <PageHeader title="Occasions" back="/" />
      {uid === null && (
        <Card className="bg-blush"><p className="text-sm font-bold">Sign in to save people and get reminders</p>
          <Link to="/auth"><Btn className="mt-3 h-10 w-full text-sm">Sign in</Btn></Link></Card>
      )}
      {uid && (
        <>
          <div className="flex gap-2">
            {["Today", "This Week", "Upcoming"].map((t) => <Chip key={t} active={tab === t} onClick={() => setTab(t)}>{t}</Chip>)}
          </div>
          {featured && (
            <div className="relative mt-5 overflow-hidden rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-glow">
              <div className="absolute right-3 top-3"><Icon3D name="cake" size={72} motion="glow" eager /></div>
              <p className="text-xs font-bold uppercase opacity-80">{featured.when}</p>
              <p className="mt-1 pr-20 text-2xl font-extrabold">{featured.first}'s {featured.occasion}</p>
              <p className="mt-2 pr-16 text-sm opacity-90">A little surprise could make {featured.first}'s whole day.</p>
              <Link to="/create" search={{ to: featured.name, occasion: featured.occasion }}>
                <Btn variant="light" className="mt-5 h-11 text-sm">Make {featured.first}'s Day</Btn>
              </Link>
            </div>
          )}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between"><h2 className="font-extrabold">Your people</h2>
              <button onClick={() => setAdding(!adding)} className="text-sm font-bold text-primary">{adding ? "Cancel" : "+ Add person"}</button></div>
            {adding && (
              <Card><form onSubmit={add} className="space-y-3">
                <Field label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tunde Akin" />
                <Field label="Phone (for WhatsApp/SMS)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234…" />
                <Field label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@email.com" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} className="min-w-0 rounded-2xl border border-border bg-card px-3 py-3 text-sm font-semibold">
                    {occasions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="min-w-0 rounded-2xl border border-border bg-card px-3 py-3 text-sm" aria-label="Date" />
                </div>
                <Btn className="h-11 w-full text-sm">Save person</Btn>
              </form></Card>
            )}
            {!loading && contacts.length === 0 && !adding && <p className="text-sm text-muted-foreground">Add the people you gift so we can remind you before their big days.</p>}
            {shown.map((c) => (
              <Card key={c.id} className="flex items-center gap-3 p-4">
                <Avatar initials={c.initials} />
                <div className="min-w-0 flex-1"><p className="truncate font-bold">{c.name}</p><p className="text-sm text-muted-foreground">{c.occasion} – {c.when}</p></div>
                <Link to="/create" search={{ to: c.name, occasion: c.occasion }} className="rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground">Gift</Link>
                <button onClick={() => remove(c.id)} aria-label={`Remove ${c.name}`} className="text-muted-foreground"><Trash2 className="size-4" /></button>
              </Card>
            ))}
            {tab === "Upcoming" && undated.map((c) => (
              <Card key={c.id} className="flex items-center gap-3 p-4">
                <Avatar initials={initialsOf(c.name)} />
                <div className="min-w-0 flex-1"><p className="truncate font-bold">{c.name}</p><p className="text-sm text-muted-foreground">No date saved</p></div>
                <button onClick={() => remove(c.id)} aria-label={`Remove ${c.name}`} className="text-muted-foreground"><Trash2 className="size-4" /></button>
              </Card>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
