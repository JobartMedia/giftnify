import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Gift } from "lucide-react";
import { AppShell, Btn, Card, PageHeader } from "@/components/giftnify/ui";
import { Icon3D } from "@/components/giftnify/Icon3D";
import { useContent } from "@/lib/content";
import { formatMoney } from "@/lib/currency";

export const Route = createFileRoute("/occasions_/$occasionId")({
  head: ({ params }) => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: `${params.occasionId} gift ideas — Giftnify` },
      { name: "description", content: `Browse gift ideas for ${params.occasionId} and send them as a mystery reveal gift.` },
      { property: "og:title", content: `${params.occasionId} gift ideas — Giftnify` },
      { property: "og:description", content: "Pick a gift, add a personal message, and keep the surprise until they open it." },
    ],
  }),
  component: OccasionGifts,
});

function OccasionGifts() {
  const { occasionId } = Route.useParams();
  const { occasions, items } = useContent();
  const occasion = occasions.find((o) => o.id.toLowerCase() === occasionId.toLowerCase());
  const label = occasion?.label ?? occasionId;

  return (
    <AppShell>
      <PageHeader title={`${label} gifts`} back="/" />
      <Card className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-3xl bg-gradient-blush">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-card shadow-soft">
          <Icon3D name={occasion?.icon ?? "gift"} size={44} motion="float" />
        </span>
        <div className="min-w-0">
          <p className="font-extrabold">Make their {label.toLowerCase()} unforgettable</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Pick a gift below — the surprise stays hidden until your message plays.</p>
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((it, i) => (
          <motion.div key={it.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
            <Link
              to="/create"
              search={{ occasion: label, item: it.name, price: it.price }}
              className="flex h-full flex-col rounded-2xl border border-border bg-card p-3 shadow-soft transition hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span className="grid h-24 place-items-center rounded-2xl bg-[radial-gradient(closest-side,var(--color-blush),transparent)]">
                <Icon3D name={it.icon} size={72} />
              </span>
              <span className="mt-2 text-[13px] font-bold leading-tight">{it.name}</span>
              <span className="mt-1 flex items-center justify-between gap-1">
                <span className="text-sm font-extrabold text-primary">{formatMoney(it.price, "USD")}</span>
                <ArrowRight className="size-4 text-muted-foreground" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      <Link to="/create" search={{ occasion: label }} className="mt-6 block">
        <Btn className="h-14 w-full rounded-full text-base shadow-glow">
          <Gift className="size-5" /> Send money for {label.toLowerCase()} instead <ArrowRight className="size-5" />
        </Btn>
      </Link>
    </AppShell>
  );
}
