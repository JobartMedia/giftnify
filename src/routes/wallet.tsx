import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/giftnify/ui";
import { WalletView, type WithdrawResult } from "@/components/giftnify/wallet/WalletView";
import { getWallet, requestWithdrawal, type WalletData, type WithdrawInput } from "@/lib/wallet.functions";
import { verifyBankAccount } from "@/lib/gifts.functions";
import { getToken } from "@/lib/api";

export const Route = createFileRoute("/wallet")({
  head: () => ({ meta: [{ title: "Wallet — Giftnify" }, { name: "robots", content: "noindex" }] }),
  component: WalletPage,
});


function WalletPage() {
  const [state, setState] = useState<"loading" | "signed_out" | "error" | "ready">("loading");
  const [data, setData] = useState<WalletData | null>(null);

  useEffect(() => {
    if (!getToken()) { setState("signed_out"); return; }
    getWallet().then((d) => { setData(d); setState("ready"); })
      .catch((e: { status?: number }) => setState(e?.status === 401 ? "signed_out" : "error"));
  }, []);

  return (
    <AppShell wide>
      <div className="mx-auto max-w-4xl">
        {state === "loading" && (
          <div className="space-y-4" aria-busy="true">
            <div className="h-10 w-40 animate-pulse rounded-xl bg-muted" />
            <div className="h-52 animate-pulse rounded-[1.75rem] bg-muted" />
          </div>
        )}
        {state === "signed_out" && (
          <div className="mx-auto max-w-md rounded-[1.75rem] border border-border bg-gradient-blush p-8 text-center">
            <h1 className="font-display text-2xl font-extrabold">Sign in to see your wallet</h1>
            <p className="mt-2 text-sm text-muted-foreground">Cash gifts you open while signed in land here instantly.</p>
            <Link to="/auth" className="mt-6 inline-flex h-12 items-center rounded-full bg-gradient-primary px-6 font-extrabold text-primary-foreground shadow-glow">Sign in</Link>
          </div>
        )}
        {state === "error" && (
          <p role="alert" className="rounded-2xl bg-muted p-5 text-sm">We couldn't load your wallet. Check your connection and that the Giftnify website is running, then reload.</p>
        )}
        {state === "ready" && data && (
          <WalletView
            wallets={data.wallets}
            transactions={data.transactions}
            withdrawals={data.withdrawals}
            methods={data.methods}
            minimums={data.minimums}
            banks={data.banks}
            createHref="/create"
            withdraw={async (input) => (await requestWithdrawal({ data: input as WithdrawInput })) as WithdrawResult}
            verifyBank={verifyBankAccount}
          />
        )}
      </div>
    </AppShell>
  );
}
