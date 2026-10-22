import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/giftnify/ui";
import { useMe } from "@/lib/auth";
import { submitGuestRequest } from "@/lib/support.functions";

const FAQS = [
  { q: "I received a gift link. What do I do?", a: "Open the link on any phone or computer — no account needed. Read, listen to or watch the message first; then you'll see who it's from and your gift." },
  { q: "My gift link says it isn't valid.", a: "The link may be incomplete, the payment may not have finished, or the gift was cancelled. Ask the sender to share it again, or contact us below with the link." },
  { q: "My payment failed or I was charged but the gift didn't send.", a: "A gift is only sent after the payment provider confirms payment. If you were charged and your gift still shows \"Awaiting Payment\" in Activity after a few minutes, contact us with the time and amount." },
  { q: "How do I redeem a gift?", a: "After the reveal, tap \"Use my gift\" and choose an option. Each gift can be redeemed once. Payouts are currently processed by our team rather than instantly." },
  { q: "Can I get a refund?", a: "If a gift hasn't been redeemed, contact support and our team can review a refund to your original payment method. Redeemed gifts can't be refunded." },
  { q: "I can't sign in.", a: "Use \"Forgot password?\" on the sign-in page to get a reset email. If you signed up with Google, use \"Continue with Google\"." },
];
const TOPICS = ["Payment", "Missing gift", "Redeeming a gift", "Account access", "Refund", "Other"] as const;

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & Support — Giftnify" },
      { name: "description", content: "Get help with a Giftnify gift, payment or account." },
      { property: "og:title", content: "Help & Support — Giftnify" },
      { property: "og:description", content: "Get help with a Giftnify gift, payment or account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HelpPage,
});


function HelpPage() {
  const { me } = useMe();
  const [busy, setBusy] = useState(false);
  const [g, setG] = useState({ email: "", topic: "Other" as (typeof TOPICS)[number], body: "", giftToken: "" });
  const [gMsg, setGMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { if (me?.email) setG((v) => (v.email ? v : { ...v, email: me.email })); }, [me]);

  // Goes to the same support inbox the website's staff console reads.
  async function submitGuest(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setGMsg(null);
    const r = await submitGuestRequest({ data: { email: g.email, topic: g.topic, body: g.body, ...(g.giftToken ? { giftToken: g.giftToken } : {}) } });
    setGMsg(r.ok ? { ok: true, text: "Thanks — we'll reply by email." } : { ok: false, text: r.error });
    if (r.ok) setG({ email: me?.email ?? "", topic: "Other", body: "", giftToken: "" });
    setBusy(false);
  }

  return (
    <AppShell nav={false}>
      <header className="flex items-center gap-3 pt-2">
        <Link to="/" aria-label="Back" className="grid size-10 place-items-center rounded-full border border-border bg-card"><ChevronLeft className="size-5" /></Link>
        <h1 className="text-2xl font-extrabold">Help & Support</h1>
      </header>
      <h2 className="mb-2 mt-6 font-extrabold">Common questions</h2>
      <div className="grid gap-2">
        {FAQS.map((f) => (
          <details key={f.q} className="rounded-2xl border border-border bg-card px-4 py-3">
            <summary className="cursor-pointer font-bold">{f.q}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
      <h2 className="mb-2 mt-8 font-extrabold">Contact us</h2>
      {(
        <form onSubmit={submitGuest} className="grid gap-3">
          {!me && <p className="text-sm text-muted-foreground">No account needed — we reply by email.</p>}
          <label className="grid gap-1 text-sm font-bold">Your email<input type="email" required value={g.email} onChange={(e) => setG({ ...g, email: e.target.value })} className="rounded-2xl border border-border bg-card px-4 py-3 font-normal outline-none focus:border-primary" /></label>
          <label className="grid gap-1 text-sm font-bold">Topic<select value={g.topic} onChange={(e) => setG({ ...g, topic: e.target.value as typeof g.topic })} className="rounded-2xl border border-border bg-card px-4 py-3 font-normal">{TOPICS.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-bold">Gift link or code (optional)<input value={g.giftToken} maxLength={64} onChange={(e) => setG({ ...g, giftToken: e.target.value.split("/").pop() ?? "" })} className="rounded-2xl border border-border bg-card px-4 py-3 font-normal outline-none focus:border-primary" /></label>
          <label className="grid gap-1 text-sm font-bold">What happened?<textarea required minLength={10} maxLength={3000} rows={4} value={g.body} onChange={(e) => setG({ ...g, body: e.target.value })} className="rounded-2xl border border-border bg-card px-4 py-3 font-normal outline-none focus:border-primary" /></label>
          {gMsg && <p role="status" className={gMsg.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-destructive"}>{gMsg.text}</p>}
          <button disabled={busy} className="rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">{busy ? "Sending…" : "Send to support"}</button>
        </form>
      )}
    </AppShell>
  );
}
