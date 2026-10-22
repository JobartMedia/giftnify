import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { signOut as apiSignOut, api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { ADMIN_URL } from "@/lib/admin";
import { useEffect, useState } from "react";
import { ChevronRight, History, Bell, Users, Shield, CreditCard, LifeBuoy, CalendarHeart, Dna } from "lucide-react";
import { AppShell, Avatar, Card, PageHeader } from "@/components/giftnify/ui";
import { CurrencySelector } from "@/components/giftnify/GiftPicker";
import type { CurrencyCode } from "@/lib/currency";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Your profile — Giftnify" },
      { name: "description", content: "Manage your Gift DNA, saved recipients, reminders, currency and privacy." },
      { property: "og:title", content: "Your profile — Giftnify" },
      { property: "og:description", content: "Your gifting preferences, all in one place." },
    ],
  }),
  component: Profile,
});

const ROWS = [
  { icon: History, label: "Gift history", to: "/activity" },
  { icon: CalendarHeart, label: "Occasion reminders", to: "/occasions" },
  { icon: Users, label: "Saved recipients", to: "/occasions" },
  { icon: Bell, label: "Notifications" },
  { icon: Shield, label: "Privacy" },
  { icon: CreditCard, label: "Payment methods" },
  { icon: LifeBuoy, label: "Support" },
];

function Profile() {
  const [cur, setCur] = useState<CurrencyCode>("NGN");
  const { me } = useMe();
  const account = me ? { email: me.email, name: me.name || me.email.split("@")[0] || "", staff: me.is_staff, sent: me.gifts_sent } : null;
  const navigate = useNavigate();
  const qc = useQueryClient();
  // Preferred currency is saved on the account, so the website uses it too.
  useEffect(() => {
    const c = me?.preferred_currency ?? localStorage.getItem("giftnify.currency");
    if (c) setCur(c as CurrencyCode);
  }, [me]);
  function chooseCurrency(c: CurrencyCode) {
    setCur(c);
    localStorage.setItem("giftnify.currency", c);
    if (me) void api("/me", { method: "PATCH", body: { preferred_currency: c } }).catch(() => {});
  }
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await apiSignOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <AppShell>
      <PageHeader title="Profile" />
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
        <Avatar initials={account ? (account.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "G") : "G"} size="lg" />
        <div className="min-w-0 break-words">
          <p className="text-xl font-extrabold">{account?.name ?? "Guest"}</p>
          <p className="text-sm text-muted-foreground">{account?.email ?? "Sign in to save your gifts"}</p>
          {account && <p className="mt-1 text-xs font-bold text-primary">{account.sent === 0 ? "No gifts sent yet" : `${account.sent} gift${account.sent === 1 ? "" : "s"} sent`}</p>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {account ? <button onClick={signOut} className="rounded-full border border-border px-4 py-2 text-sm font-bold">Sign out</button>
          : <Link to="/auth" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Sign in</Link>}
        {account?.staff && <a href={ADMIN_URL} className="rounded-full border border-border px-4 py-2 text-sm font-bold">Admin</a>}
        <Link to="/help" className="rounded-full border border-border px-4 py-2 text-sm font-bold">Help &amp; support</Link>
        <Link to="/terms" className="rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground">Terms</Link>
        <Link to="/privacy" className="rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground">Privacy</Link>
      </div>
      {!account && (
        <Card className="mt-5 bg-blush">
          <p className="font-extrabold">New to Giftnify?</p>
          <p className="mt-1 text-sm text-muted-foreground">Create a free account to send gifts, save recipients and follow every gift from any device.</p>
          <Link to="/demo" className="mt-3 inline-block text-sm font-bold text-primary">Preview the experience →</Link>
        </Card>
      )}
      <Link to="/profile/dna" className="mt-6 flex items-center gap-3 rounded-3xl bg-gradient-primary p-5 text-primary-foreground shadow-glow">
        <Dna className="size-7" />
        <div className="flex-1"><p className="font-extrabold">My Gift DNA</p><p className="text-sm opacity-85">Help people gift you better</p></div>
        <ChevronRight />
      </Link>
      <p className="mb-2 mt-6 font-extrabold">Preferred currency</p>
      <CurrencySelector value={cur} onChange={chooseCurrency} />
      <Card className="mt-6 divide-y p-0">
        {ROWS.map(({ icon: Icon, label, to }) => {
          const inner = (<><span className="grid size-10 place-items-center rounded-xl bg-blush text-primary"><Icon className="size-5" /></span><span className="flex-1 font-semibold">{label}</span><ChevronRight className="size-4 text-muted-foreground" /></>);
          return to
            ? <Link key={label} to={to} className="flex items-center gap-3 px-5 py-3.5">{inner}</Link>
            : <div key={label} className="flex items-center gap-3 px-5 py-3.5">{inner}</div>;
        })}
      </Card>
    </AppShell>
  );
}
