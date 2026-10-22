import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Avatar, Card, PageHeader } from "@/components/giftnify/ui";
import { DEMO_GIFTS } from "@/lib/gifts";
import { formatMoney } from "@/lib/currency";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Preview the Experience — Giftnify" },
      { name: "description", content: "Try a sample Mystery Gift reveal. Sample data only — no payment, no real gifts." },
      { property: "og:title", content: "Preview the Experience — Giftnify" },
      { property: "og:description", content: "See what a Giftnify Mystery Gift feels like to open." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Demo,
});

function Demo() {
  const reveal = DEMO_GIFTS[0]!;
  return (
    <AppShell>
      <PageHeader title="Preview the Experience" />
      <div role="note" className="rounded-2xl border border-primary/30 bg-blush px-4 py-3 text-sm">
        <span className="font-extrabold text-primary">Sample only.</span> These gifts are made up to show how Giftnify works. Nothing here is paid, sent or redeemable.
      </div>
      <Link to="/gift/$token" params={{ token: reveal.token }} className="mt-5 block">
        <Card className="bg-gradient-plum text-plum-foreground">
          <p className="text-xs font-bold uppercase tracking-wider opacity-70">Sample reveal</p>
          <p className="mt-1 text-xl font-extrabold">Open a sample Mystery Gift</p>
          <p className="mt-1 text-sm opacity-80">Message first, then who it's from, then the gift.</p>
        </Card>
      </Link>
      <p className="mb-3 mt-6 font-extrabold">Sample activity</p>
      <div className="space-y-3">
        {DEMO_GIFTS.slice(1).map((g) => {
          const who = g.direction === "received" ? g.senderName : g.recipientName;
          return (
            <Card key={g.token} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4">
              <Avatar initials={who.split(" ").map((p) => p[0]).join("").slice(0, 2)} />
              <div className="min-w-0"><p className="truncate font-bold">{who}</p><p className="text-sm text-muted-foreground">{g.occasion} · Sample</p></div>
              <div className="text-right"><p className="text-sm font-extrabold">{g.item ?? formatMoney(g.amount, g.currency)}</p><p className="text-[11px] font-bold text-muted-foreground">{g.status}</p></div>
            </Card>
          );
        })}
      </div>
      <Link to="/create" className="mt-6 block rounded-full bg-primary py-3 text-center font-bold text-primary-foreground">Create a real Mystery Gift</Link>
    </AppShell>
  );
}
