import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, Loader2, Wallet as WalletIcon, X } from 'lucide-react';

/**
 * Giftnify wallet screen. Framework-free; the website and the app pass data and
 * a withdraw() adapter. Keep both copies identical:
 *   resources/js/Components/wallet/WalletView.tsx
 *   src/components/giftnify/wallet/WalletView.tsx
 */

export interface WalletBalance { currency: string; balance: number }
export interface WalletTx { id: string; type: 'credit' | 'debit'; source: string; amount: number; currency?: string | null; description?: string | null; created_at?: string | null }
export interface WalletWithdrawal { id: string; amount: number; currency: string; method: string; destination: string; status: string; failure_reason?: string | null; created_at?: string | null }
export interface WithdrawInput { currency: string; amount: number; method: string; bank?: string; account?: string; account_name?: string; destination?: string }
export type WithdrawResult = { result: string; minimum?: number | null; wallets?: WalletBalance[] };

interface Props {
  wallets: WalletBalance[];
  transactions: WalletTx[];
  withdrawals: WalletWithdrawal[];
  methods: string[];
  minimums: Record<string, number>;
  withdraw: (input: WithdrawInput) => Promise<WithdrawResult>;
  verifyBank?: (bank: string, account: string) => Promise<string | null>;
  createHref?: string;
  /** Bank names from the payment provider. */
  banks?: string[];
}

const FALLBACK_BANKS = ['Access Bank', 'Fidelity Bank', 'First Bank of Nigeria', 'Guaranty Trust Bank', 'Kuda Bank', 'Moniepoint MFB', 'United Bank For Africa', 'Wema Bank', 'Zenith Bank'];

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Requested', tone: 'bg-[#FFF4E0] text-[#8A5A00]' },
  processing: { label: 'Processing', tone: 'bg-petal text-magenta-deep' },
  paid: { label: 'Paid', tone: 'bg-[#E6F7F0] text-[#0B7A55]' },
  failed: { label: 'Failed, refunded', tone: 'bg-[#FDECEC] text-[#A12B2B]' },
  cancelled: { label: 'Cancelled, refunded', tone: 'bg-muted text-ink-soft' },
};

const ERRORS: Record<string, string> = {
  insufficient: "That's more than your balance.",
  bank_not_found: "We couldn't find that account. Check the number and bank.",
  bank_unavailable: "Bank checks aren't available right now. Try again shortly.",
  below_minimum: 'That is below the smallest withdrawal.',
  no_wallet: 'You have no balance in that currency yet.',
  rate_limited: 'Too many attempts. Wait a minute, then try again.',
  error: 'The withdrawal did not go through. Nothing was taken from your balance.',
};

export function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

const when = (iso?: string | null) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

export function WalletView(props: Props) {
  const [wallets, setWallets] = useState<WalletBalance[]>(props.wallets);
  const [withdrawals, setWithdrawals] = useState<WalletWithdrawal[]>(props.withdrawals);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const funded = wallets.filter((w) => w.balance > 0);
  const main = funded[0] ?? wallets[0];
  const others = wallets.filter((w) => w !== main && w.balance > 0);

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-ink md:text-4xl">Wallet</h1>
        <p className="mt-1 text-sm text-ink-soft">Cash gifts land here the moment you open them. Withdraw whenever you like.</p>
      </div>

      {notice && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-[#E6F7F0] p-4 text-sm font-semibold text-[#0B7A55]">
          <Check className="size-4" aria-hidden /> {notice}
        </p>
      )}

      {/* Balance */}
      <section aria-label="Balance" className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-plum p-6 text-white shadow-card md:p-8">
          <p className="text-sm font-semibold text-white/70">Available balance</p>
          <p className="mt-2 font-display text-5xl font-extrabold tracking-tight tabular-nums">
            {main ? money(main.balance, main.currency) : money(0, 'NGN')}
          </p>
          {others.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {others.map((w) => (
                <li key={w.currency} className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold tabular-nums ring-1 ring-inset ring-white/15">
                  {money(w.balance, w.currency)}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setOpen(true); setNotice(null); }}
              disabled={funded.length === 0}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-extrabold text-plum transition hover:bg-petal disabled:opacity-50"
            >
              <ArrowUpRight className="size-4" aria-hidden /> Withdraw
            </button>
          </div>
          <WalletIcon aria-hidden className="pointer-events-none absolute -bottom-6 -right-6 size-40 text-white/[0.06]" strokeWidth={1.5} />
        </div>

        {funded.length === 0 ? (
          <div className="rounded-[1.75rem] border border-line bg-gradient-blush p-6">
            <h2 className="font-display text-xl font-extrabold text-ink">Nothing here yet</h2>
            <p className="mt-1 text-sm text-ink-soft">When someone sends you a cash gift, open it while signed in and it's added here instantly.</p>
            {props.createHref && (
              <a href={props.createHref} className="mt-5 inline-flex h-11 items-center rounded-full bg-gradient-primary px-5 text-sm font-extrabold text-white shadow-glow">
                Send someone a gift
              </a>
            )}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-line bg-white p-6">
            <h2 className="font-display text-xl font-extrabold text-ink">How withdrawals work</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              <li>Choose a bank account, airtime, data, electricity or a gift card.</li>
              <li>The amount leaves your balance straight away and shows as requested.</li>
              <li>If a payout fails, the money comes back to your wallet automatically.</li>
            </ul>
          </div>
        )}
      </section>

      {open && (
        <WithdrawForm
          wallets={funded}
          methods={props.methods}
          minimums={props.minimums}
          withdraw={props.withdraw}
          verifyBank={props.verifyBank}
          banks={props.banks?.length ? props.banks : FALLBACK_BANKS}
          onClose={() => setOpen(false)}
          onDone={(r, input) => {
            if (r.wallets) setWallets(r.wallets);
            setWithdrawals((w) => [{
              id: `new-${Date.now()}`, amount: input.amount, currency: input.currency, method: input.method,
              destination: input.method === 'Bank Transfer' ? `${input.bank} ••${(input.account ?? '').slice(-4)}` : `••${(input.destination ?? '').slice(-4)}`,
              status: 'pending', created_at: new Date().toISOString(),
            }, ...w]);
            setOpen(false);
            setNotice(`Withdrawal of ${money(input.amount, input.currency)} requested.`);
          }}
        />
      )}

      {/* Withdrawals */}
      {withdrawals.length > 0 && (
        <section aria-labelledby="wd-title">
          <h2 id="wd-title" className="font-display text-xl font-extrabold text-ink">Withdrawals</h2>
          <ul className="mt-3 divide-y divide-line rounded-[1.5rem] border border-line bg-white">
            {withdrawals.map((w) => {
              const st = STATUS[w.status] ?? STATUS.pending;
              return (
                <li key={w.id} className="flex items-center gap-3 p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-ink"><ArrowUpRight className="size-4" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{w.method} · {w.destination}</p>
                    <p className="text-xs text-ink-soft">{when(w.created_at)}{w.failure_reason ? ` · ${w.failure_reason}` : ''}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-extrabold tabular-nums text-ink">{money(w.amount, w.currency)}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${st.tone}`}>{st.label}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Ledger */}
      <section aria-labelledby="tx-title">
        <h2 id="tx-title" className="font-display text-xl font-extrabold text-ink">Activity</h2>
        {props.transactions.length === 0 ? (
          <p className="mt-3 rounded-[1.5rem] border border-dashed border-line p-6 text-center text-sm text-ink-soft">Gifts you receive and withdrawals you make will show here.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-[1.5rem] border border-line bg-white">
            {props.transactions.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-4">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full ${t.type === 'credit' ? 'bg-[#E6F7F0] text-[#0B7A55]' : 'bg-muted text-ink'}`}>
                  {t.type === 'credit' ? <ArrowDownLeft className="size-4" aria-hidden /> : <ArrowUpRight className="size-4" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{t.description || (t.type === 'credit' ? 'Money in' : 'Money out')}</p>
                  <p className="text-xs text-ink-soft">{when(t.created_at)}</p>
                </div>
                <p className={`shrink-0 text-sm font-extrabold tabular-nums ${t.type === 'credit' ? 'text-[#0B7A55]' : 'text-ink'}`}>
                  {t.type === 'credit' ? '+' : '−'}{money(t.amount, t.currency || 'NGN')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function WithdrawForm({ wallets, methods, minimums, withdraw, verifyBank, banks, onClose, onDone }: {
  wallets: WalletBalance[]; methods: string[]; minimums: Record<string, number>;
  withdraw: Props['withdraw']; verifyBank?: Props['verifyBank']; banks: string[];
  onClose: () => void; onDone: (r: WithdrawResult, input: WithdrawInput) => void;
}) {
  const [currency, setCurrency] = useState(wallets[0]?.currency ?? 'NGN');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(methods[0] ?? 'Bank Transfer');
  const [bank, setBank] = useState('');
  const [account, setAccount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [destination, setDestination] = useState('');
  const [checking, setChecking] = useState(false);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const wallet = useMemo(() => wallets.find((w) => w.currency === currency), [wallets, currency]);
  const min = minimums[currency] ?? 1;
  const value = Number(amount);
  const amountError = !amount ? null : !Number.isFinite(value) || value <= 0 ? 'Enter an amount.' : value < min ? `The smallest withdrawal is ${money(min, currency)}.` : wallet && value > wallet.balance ? "That's more than your balance." : null;
  const bankReady = method !== 'Bank Transfer' || (bank && /^\d{10}$/.test(account) && accountName.trim().length > 2 && !lookupFailed);
  const destReady = method === 'Bank Transfer' || destination.trim().length >= 5;
  const ready = !!amount && !amountError && bankReady && destReady && !busy;

  const lookup = async (b: string, a: string) => {
    setAccountName(''); setLookupFailed(false);
    if (a.length === 10 && b && verifyBank) {
      setChecking(true);
      const name = await verifyBank(b, a).catch(() => null);
      setChecking(false);
      if (name) setAccountName(name); else setLookupFailed(true);
    }
  };
  const onAccount = (a: string) => { setAccount(a); void lookup(bank, a); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true); setErr(null);
    const input: WithdrawInput = method === 'Bank Transfer'
      ? { currency, amount: value, method, bank, account, account_name: accountName.trim() }
      : { currency, amount: value, method, destination: destination.trim() };
    const r = await withdraw(input).catch(() => ({ result: 'error' } as WithdrawResult));
    setBusy(false);
    if (r.result === 'ok') onDone(r, input);
    else setErr(r.result === 'below_minimum' && r.minimum ? `The smallest withdrawal is ${money(r.minimum, currency)}.` : ERRORS[r.result] ?? ERRORS.error);
  };

  const field = 'h-12 w-full rounded-2xl border border-line bg-white px-4 text-[15px] text-ink outline-none transition focus:border-magenta focus:ring-4 focus:ring-magenta/10';

  return (
    <form onSubmit={submit} className="rounded-[1.75rem] border border-line bg-white p-5 shadow-soft md:p-7" aria-labelledby="wf-title">
      <div className="flex items-start justify-between gap-4">
        <h2 id="wf-title" className="font-display text-2xl font-extrabold text-ink">Withdraw</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-full text-ink-soft hover:bg-muted"><X className="size-5" aria-hidden /></button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="wf-amount" className="text-sm font-bold text-ink">Amount</label>
          <div className="flex gap-2">
            {wallets.length > 1 && (
              <select id="wf-currency" aria-label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${field} !w-[5.5rem] shrink-0 px-3`}>
                {wallets.map((w) => <option key={w.currency}>{w.currency}</option>)}
              </select>
            )}
            <input id="wf-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder={`Min ${money(min, currency)}`} className={`${field} min-w-0 flex-1`} aria-invalid={!!amountError} />
            {wallet && (
              <button type="button" onClick={() => setAmount(String(wallet.balance))} className="h-12 shrink-0 rounded-2xl bg-petal px-3.5 text-sm font-bold text-magenta-deep">Max</button>
            )}
          </div>
          <p className={`text-xs ${amountError ? 'text-[#A12B2B]' : 'text-ink-soft'}`}>{amountError ?? (wallet ? `Available ${money(wallet.balance, currency)}` : '')}</p>
        </div>

        <div className="grid gap-2">
          <label htmlFor="wf-method" className="text-sm font-bold text-ink">Send to</label>
          <select id="wf-method" value={method} onChange={(e) => setMethod(e.target.value)} className={field}>
            {methods.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>

        {method === 'Bank Transfer' ? (
          <>
            <div className="grid gap-2">
              <label htmlFor="wf-bank" className="text-sm font-bold text-ink">Bank</label>
              <select id="wf-bank" value={bank} onChange={(e) => { setBank(e.target.value); void lookup(e.target.value, account); }} className={field}>
                <option value="">Select your bank</option>
                {banks.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="wf-account" className="text-sm font-bold text-ink">Account number</label>
              <input id="wf-account" inputMode="numeric" maxLength={10} value={account} onChange={(e) => onAccount(e.target.value.replace(/\D/g, ''))} placeholder="10 digits" className={field} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label htmlFor="wf-name" className="text-sm font-bold text-ink">Account name</label>
              <div className="relative">
                <input id="wf-name" value={accountName} readOnly placeholder={lookupFailed ? 'Account not found' : 'Filled in by your bank'} className={`${field} bg-[#FFF8FB]`} />
                {checking && <Loader2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-soft" aria-hidden />}
              </div>
              <p className={`text-xs ${lookupFailed ? 'text-[#A12B2B]' : 'text-ink-soft'}`}>{lookupFailed ? "We couldn't find that account. Check the number and bank." : 'We look up the name with your bank. Check it is yours before withdrawing.'}</p>
            </div>
          </>
        ) : (
          <div className="grid gap-2 md:col-span-2">
            <label htmlFor="wf-dest" className="text-sm font-bold text-ink">
              {method === 'Electricity' ? 'Meter number' : method === 'Gift Card' ? 'Email address' : 'Phone number'}
            </label>
            <input id="wf-dest" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={method === 'Electricity' ? 'e.g. 45031234567' : method === 'Gift Card' ? 'name@example.com' : '+234 803 555 0142'} className={field} />
          </div>
        )}
      </div>

      {err && <p role="alert" className="mt-4 rounded-xl bg-[#FDECEC] p-3 text-sm font-semibold text-[#A12B2B]">{err}</p>}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="h-12 rounded-full px-5 text-sm font-bold text-ink-soft hover:text-ink">Cancel</button>
        <button type="submit" disabled={!ready} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-primary px-7 font-extrabold text-white shadow-glow transition disabled:opacity-45">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Withdraw{value > 0 && !amountError ? ` ${money(value, currency)}` : ''}
        </button>
      </div>
    </form>
  );
}
