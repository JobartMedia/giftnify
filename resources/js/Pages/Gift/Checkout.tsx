import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AppLayout } from '../../Layouts/AppLayout';
import { Icon3D } from '../../Components/Icon3D';
import { Lock, Tag, Loader2, ShieldCheck, Check } from 'lucide-react';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content || '';

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

const PROVIDER_LABEL: Record<string, string> = {
  paystack: 'Paystack',
  flutterwave: 'Flutterwave',
  stripe: 'Stripe',
  demo: 'Test mode (no real charge)',
};

export default function Checkout({ gift, quote: initialQuote, provider }: any) {
  const [quote, setQuote] = useState(initialQuote);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [paying, setPaying] = useState(false);

  const applyCode = async () => {
    if (!code.trim() || checking) return;
    setChecking(true);
    setCodeMsg(null);
    try {
      const res = await fetch(`/checkout/${encodeURIComponent(gift.token)}/quote`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify({ promo_code: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeMsg({ ok: false, text: data.message || "That code couldn't be checked. Try again." });
      } else {
        setQuote(data);
        setCodeMsg({ ok: data.promo_applied, text: data.message });
      }
    } catch {
      setCodeMsg({ ok: false, text: "That code couldn't be checked. Check your connection." });
    } finally {
      setChecking(false);
    }
  };

  const pay = () => {
    if (paying || !provider) return;
    setPaying(true);
    router.post('/payment/start', { token: gift.token, promo_code: quote.promo_applied ? quote.promo_code : '' }, {
      onFinish: () => setPaying(false),
    });
  };

  return (
    <AppLayout>
      <Head title="Checkout" />

      <div className="mx-auto max-w-xl space-y-6 pb-16">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink md:text-4xl">Pay for your gift</h1>
          <p className="mt-1 text-ink-soft">
            {gift.recipient_name}'s {gift.occasion.toLowerCase()} gift, delivered by {gift.delivery === 'Link' ? 'a link you share' : gift.delivery}.
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-line bg-white p-5 shadow-soft md:p-7">
          <div className="flex items-center gap-4 border-b border-line pb-5">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-petal">
              <Icon3D name={gift.item ? 'gift' : 'money'} size="md" className="!size-10" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-ink">{gift.item ?? 'Cash gift'}</p>
              <p className="text-sm text-ink-soft">For {gift.recipient_name}</p>
            </div>
            <p className="font-display text-2xl font-extrabold tabular-nums text-ink">{money(quote.amount, quote.currency)}</p>
          </div>

          {/* Promo */}
          <div className="mt-5">
            <label htmlFor="promo" className="text-sm font-bold text-ink">Promo code</label>
            <div className="mt-2 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Tag className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
                <input
                  id="promo"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && applyCode()}
                  placeholder="Optional"
                  autoComplete="off"
                  className="h-12 w-full rounded-2xl border border-line bg-white pl-10 pr-4 text-[15px] uppercase text-ink outline-none transition focus:border-magenta focus:ring-4 focus:ring-magenta/10"
                />
              </div>
              <button type="button" onClick={applyCode} disabled={!code.trim() || checking} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-petal px-5 text-sm font-bold text-magenta-deep disabled:opacity-50">
                {checking && <Loader2 className="size-4 animate-spin" aria-hidden />} Apply
              </button>
            </div>
            {codeMsg && (
              <p role="status" className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${codeMsg.ok ? 'text-[#0B7A55]' : 'text-[#A12B2B]'}`}>
                {codeMsg.ok && <Check className="size-4" aria-hidden />} {codeMsg.text}
              </p>
            )}
          </div>

          {/* Totals — all from the server */}
          <dl className="mt-6 space-y-2.5 border-t border-line pt-5 text-sm">
            <div className="flex justify-between text-ink-soft">
              <dt>Gift</dt>
              <dd className="font-semibold tabular-nums text-ink">{money(quote.amount, quote.currency)}</dd>
            </div>
            <div className="flex justify-between text-ink-soft">
              <dt>Service fee ({Math.round(quote.fee_rate * 1000) / 10}%)</dt>
              <dd className="font-semibold tabular-nums text-ink">{money(quote.fee, quote.currency)}</dd>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between font-semibold text-[#0B7A55]">
                <dt>Promo {quote.promo_code}</dt>
                <dd className="tabular-nums">−{money(quote.discount, quote.currency)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="font-extrabold text-ink">Total</dt>
              <dd className="font-display text-3xl font-extrabold tabular-nums text-ink">{money(quote.total, quote.currency)}</dd>
            </div>
          </dl>

          {provider ? (
            <button
              type="button"
              onClick={pay}
              disabled={paying}
              className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-primary text-base font-extrabold text-white shadow-glow transition active:scale-[0.98] disabled:opacity-60"
            >
              {paying ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Lock className="size-5" aria-hidden />}
              Pay {money(quote.total, quote.currency)}
            </button>
          ) : (
            <p role="alert" className="mt-6 rounded-2xl bg-[#FFF4E0] p-4 text-sm font-semibold text-[#8A5A00]">
              Payments in {quote.currency} aren't available yet. Go back and create the gift in another currency.
            </p>
          )}

          {provider && (
            <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-ink-soft">
              <ShieldCheck className="size-4 text-[#0B7A55]" aria-hidden />
              Card details go straight to {PROVIDER_LABEL[provider] ?? provider}. Giftnify never sees them.
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
