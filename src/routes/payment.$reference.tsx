import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell, Btn, Card } from "@/components/giftnify/ui";
import { Icon3D } from "@/components/giftnify/Icon3D";
import { confirmGiftPayment } from "@/lib/payments.functions";

export const Route = createFileRoute("/payment/$reference")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Confirming payment — Giftnify" },
      { name: "description", content: "We're confirming your payment and getting your gift ready." },
      { property: "og:title", content: "Confirming payment — Giftnify" },
      { property: "og:description", content: "Your gift is almost on its way." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentReturn,
});

function PaymentReturn() {
  const { reference } = Route.useParams();
  const [state, setState] = useState<{ status: string; giftToken?: string; shareLink?: string } | null>(null);

  useEffect(() => {
    let tries = 0; let stop = false;
    const run = async () => {
      try {
        const r = await confirmGiftPayment({ data: { reference } });
        if (stop) return;
        if (r.status === "pending" && tries++ < 5) { setTimeout(run, 2500); return; }
        setState(r);
      } catch { if (!stop) setState({ status: "error" }); }
    };
    run();
    return () => { stop = true; };
  }, [reference]);

  return (
    <AppShell nav={false}>
      <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
        {!state && (<><Loader2 className="size-10 animate-spin text-primary" /><h1 className="mt-6 text-2xl font-extrabold">Confirming your payment…</h1></>)}
        {state?.status === "paid" && (
          <>
            <Icon3D name="giftOpen" size={120} motion="float" eager />
            <h1 className="mt-6 text-3xl font-extrabold">Payment confirmed</h1>
            <p className="mt-2 text-muted-foreground">Your gift is ready to share.</p>
            {state.giftToken && (
              <Card className="mt-6 w-full text-left">
                <p className="text-sm text-muted-foreground">Gift link</p>
                <p className="mt-1 break-all font-mono text-sm">{state.shareLink ?? `${window.location.origin}/gift/${state.giftToken}`}</p>
              </Card>
            )}
            <Link to="/activity" className="mt-6 w-full"><Btn className="w-full">View Gift Status</Btn></Link>
          </>
        )}
        {state && state.status !== "paid" && (
          <>
            <Icon3D name="gift" size={100} />
            <h1 className="mt-6 text-2xl font-extrabold">{state.status === "pending" ? "Payment not completed yet" : "We couldn't confirm this payment"}</h1>
            <p className="mt-2 text-muted-foreground">No gift has been sent. If you were charged, it will be confirmed automatically shortly.</p>
            <Link to="/activity" className="mt-6 w-full"><Btn variant="outline" className="w-full">Go to Activity</Btn></Link>
          </>
        )}
      </div>
    </AppShell>
  );
}
