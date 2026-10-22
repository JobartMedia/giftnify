import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, Avatar, Card, Chip, PageHeader } from "@/components/giftnify/ui";
import { type Gift, type GiftStatus } from "@/lib/gifts";
import { api, getToken } from "@/lib/api";
import { formatMoney } from "@/lib/currency";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Gift activity — Giftnify" },
      { name: "description", content: "Track every gift you've sent, received and scheduled — from sent to opened to redeemed." },
      { property: "og:title", content: "Gift activity — Giftnify" },
      { property: "og:description", content: "See when your gift is opened and unlocked." },
    ],
  }),
  component: ActivityPage,
});

const STATUS_STYLE: Record<GiftStatus, string> = {
  "Awaiting Payment": "bg-muted text-muted-foreground",
  Preparing: "bg-muted text-muted-foreground",
  Sent: "bg-secondary text-primary-deep",
  Opened: "bg-secondary text-primary-deep",
  "Message Viewed": "bg-blush text-primary",
  Unlocked: "bg-primary text-primary-foreground",
  Redeemed: "bg-success text-primary-foreground",
  Refunded: "bg-muted text-muted-foreground",
  Cancelled: "bg-muted text-muted-foreground",
};

interface ApiGift {
  token: string; recipient_name: string; occasion: string; message_type: Gift["messageType"]; message_text: string | null;
  currency: string; amount: number; item: string | null; delivery: string; status: string; created_at: string | null;
}

function ActivityPage() {
  const [tab, setTab] = useState<Gift["direction"]>("sent");
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    if (!getToken()) { setSignedIn(false); return; }
    // The same list as the website's "My gifts" page.
    api<ApiGift[]>("/gifts").then((rows) => {
      setSignedIn(true);
      setGifts(rows.map((r) => ({ token: r.token, direction: "sent", senderName: "You", recipientName: r.recipient_name, occasion: r.occasion,
        messageType: r.message_type, messageText: r.message_text ?? "", currency: r.currency as Gift["currency"], amount: r.amount,
        ...(r.item ? { item: r.item } : {}), delivery: r.delivery, status: r.status as GiftStatus, createdAt: r.created_at ?? "" })));
    }).catch(() => setSignedIn(false));
  }, []);
  const list = gifts.filter((g) => g.direction === tab);
  return (
    <AppShell>
      <PageHeader title="Gift Activity" />
      <div className="flex gap-2">
        {(["sent", "received", "scheduled"] as const).map((t) => <Chip key={t} active={tab === t} onClick={() => setTab(t)}><span className="capitalize">{t}</span></Chip>)}
      </div>
      <div className="mt-5 space-y-3">
        {list.map((g) => {
          const who = tab === "received" ? g.senderName : g.recipientName;
          return (
            <Link key={g.token} to="/gift/$token" params={{ token: g.token }} className="block">
              <Card className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 p-4">
                <Avatar initials={who.split(" ").map((p) => p[0]).join("").slice(0, 2)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{who}</p>
                  <p className="text-sm text-muted-foreground">{g.occasion} · <span className="capitalize">{g.messageType}</span></p>
                </div>
                <div className="col-start-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <p className="min-w-0 break-words text-sm font-extrabold">{g.item ?? formatMoney(g.amount, g.currency)}</p>
                  <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLE[g.status]}`}>{g.status}</span>
                </div>
              </Card>
            </Link>
          );
        })}
        {signedIn === false && (
          <Card className="py-10 text-center">
            <p className="font-extrabold">Sign in to see your gifts</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">Gifts you send are saved to your account so you can follow them from any device.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link to="/auth" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Sign in</Link>
              <Link to="/demo" className="rounded-full border border-border px-4 py-2 text-sm font-bold">See a sample</Link>
            </div>
          </Card>
        )}
        {signedIn && list.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">
            {tab === "sent" ? "You haven't sent a gift yet." : tab === "received" ? "Gifts sent to you open from the link you receive — they aren't listed here yet." : "No scheduled gifts."}
          </p>
        )}
      </div>
    </AppShell>
  );
}
