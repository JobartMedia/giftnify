import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/giftnify/ui";
import { Icon3D } from "@/components/giftnify/Icon3D";
import { RevealTheatre, type RevealApi, type RevealGift, type RedeemResult } from "@/components/giftnify/reveal/RevealTheatre";
import { getGiftByToken, markGiftOpened, revealGift, replyToGift, redeemGift, sendGiftCode, verifyGiftCode, verifyBankAccount } from "@/lib/gifts.functions";
import { findGift } from "@/lib/gifts";
import { claimGiftToWallet } from "@/lib/wallet.functions";

export const Route = createFileRoute("/gift/$token")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "You got a gift — Giftnify" },
      { name: "description", content: "Someone sent you a mystery gift. Play their message to find out who, and what's inside." },
      { property: "og:title", content: "You got a gift — Giftnify" },
      { property: "og:description", content: "Someone sent you a mystery gift on Giftnify." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Recipient,
});

const DEMO_HINT = "Someone who has known you since before you were this version of yourself.";

function Recipient() {
  const { token } = Route.useParams();
  const [gift, setGift] = useState<RevealGift | null | undefined>(undefined);
  const [problem, setProblem] = useState<string | null>(null);
  const [banks, setBanks] = useState<string[]>([]);
  const demo = findGift(token);

  useEffect(() => {
    if (demo) {
      setGift({ token, isDemo: true, recipientName: "You", occasion: demo.occasion, messageType: demo.messageType, messageText: demo.messageText, mediaUrl: demo.mediaUrl, hint: DEMO_HINT, revealed: false, hasReply: false });
      return;
    }
    getGiftByToken({ data: { token } }).then((g) => {
      if (g && "error" in g) { setProblem(g.error === "expired" ? "This gift link has expired." : "Too many attempts. Wait a minute, then try again."); setGift(null); return; }
      if (!g) { setGift(null); return; }
      const { banks: list, ...sealed } = g;
      setBanks(list);
      setGift({ ...sealed, isDemo: false });
    }).catch(() => { setProblem("We couldn't load this gift. Check your connection and try again."); setGift(null); });
  }, [token, demo]);

  const api = useMemo<RevealApi>(() => {
    if (demo) {
      return {
        markOpened: () => {},
        reveal: async () => ({ senderName: demo.senderName, senderFirst: demo.senderName.split(" ")[0], currency: demo.currency, amount: demo.amount, item: demo.item ?? null, redeemed: false }),
        reply: async () => { await new Promise((r) => setTimeout(r, 600)); return "ok"; },
        redeem: async () => { await new Promise((r) => setTimeout(r, 800)); return "ok"; },
        verifyBank: async (bank, acct) => (/^\d{10}$/.test(acct) && bank ? "ADEBAYO T. OKON" : null),
      };
    }
    return {
      markOpened: () => { void markGiftOpened({ data: { token } }).catch(() => {}); },
      // Signed in? The website credits the wallet on this same call, so the balance shows with the name.
      reveal: async () => {
        const r = await revealGift({ data: { token } });
        if ("error" in r) throw new Error(r.error);
        return { ...r, redeemed: r.wallet?.credited ? true : r.redeemed };
      },
      claim: async () => claimGiftToWallet({ data: { token } }),
      reply: async ({ text, voice }) => (await replyToGift({ data: { token, ...(text ? { text } : {}), ...(voice ? { voice } : {}) } })).result,
      redeem: async (method, details) => (await redeemGift({ data: { token, method, details } })).result as RedeemResult,
      verifyBank: (bank, acct) => verifyBankAccount(bank, acct),
      sendCode: () => sendGiftCode({ data: { token } }),
      verifyCode: (code) => verifyGiftCode({ data: { token, code } }),
    };
  }, [demo, token]);

  if (gift === undefined) return <div className="min-h-[100dvh] bg-gradient-plum" aria-busy="true" />;

  if (gift === null) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-gradient-plum px-5 text-plum-foreground">
        <div className="w-full max-w-md text-center">
          <h1 className="font-display text-3xl font-extrabold">{problem ?? "This gift link isn't valid"}</h1>
          <p className="mt-2 opacity-70">{problem ? "If you think this is a mistake, contact the sender or our support team." : "Check the link, or ask the sender to share it again."}</p>
          <Link to="/help" className="mt-6 inline-flex h-12 items-center rounded-full bg-white px-6 font-extrabold text-plum">Get help</Link>
        </div>
      </div>
    );
  }

  return (
    <RevealTheatre
      gift={gift}
      api={api}
      walletHref="/wallet"
      banks={banks}
      signInHref={`/auth?redirect=${encodeURIComponent(`/gift/${token}`)}`}
      logo={<Link to="/" aria-label="Giftnify home"><Logo light /></Link>}
      icon={(name, size) => <Icon3D name={name} size={size} eager />}
    />
  );
}
