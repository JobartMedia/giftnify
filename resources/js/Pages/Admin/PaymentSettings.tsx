import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { AdminLayout } from '../../Layouts/AdminLayout';
import { KeyRound, CheckCircle2, AlertTriangle, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Field = { label: string; set: boolean; source: 'console' | 'env' | null; ending: string | null; mode: 'live' | 'test' | null };
interface Settings {
  fields: Record<string, Field>;
  allow_demo: boolean;
  demo_possible: boolean;
  routes: Record<string, string | null>;
  payable: string[];
  webhooks: { paystack: string; flutterwave: string };
}

const GROUPS: { title: string; note: string; keys: string[]; dashboard: string }[] = [
  {
    title: 'Paystack',
    note: 'Collects Naira (cards, bank transfer, USSD) and verifies bank accounts for payouts.',
    keys: ['paystack_secret_key', 'paystack_public_key'],
    dashboard: 'Paystack dashboard → Settings → API Keys & Webhooks',
  },
  {
    title: 'Flutterwave',
    note: 'Collects GBP, EUR and USD from senders abroad. Optional.',
    keys: ['flutterwave_secret_key', 'flutterwave_webhook_hash'],
    dashboard: 'Flutterwave dashboard → Settings → API Keys, and Webhooks for the secret hash',
  },
];

function xsrf() {
  const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export default function PaymentSettings({ settings }: { settings: Settings }) {
  const { errors } = usePage().props as { errors: Record<string, string> };
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<{ ok: boolean; message: string } | null>(null);

  const save = (extra: { clear?: string[]; allow_demo?: boolean } = {}) => {
    setSaving(true);
    router.post('/admin/settings/payments', { keys: values, ...extra }, {
      preserveScroll: true,
      onSuccess: () => { setValues({}); toast.success('Payment settings saved.'); },
      onError: (e) => toast.error((Object.values(e)[0] as string) || 'Could not save.'),
      onFinish: () => setSaving(false),
    });
  };

  const runCheck = async () => {
    setChecking(true); setCheck(null);
    try {
      const res = await fetch('/admin/settings/payments/check', {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-XSRF-TOKEN': xsrf(), 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin',
      });
      setCheck(await res.json());
    } catch {
      setCheck({ ok: false, message: "Couldn't run the check. Reload the page and try again." });
    } finally {
      setChecking(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => toast.success('Copied'), () => toast.error('Copy failed — select the text instead.'));
  };

  const paystackReady = settings.fields.paystack_secret_key?.set;

  return (
    <AdminLayout>
      <Head title="Payment settings — Staff" />
      <div className="mx-auto max-w-3xl space-y-6 pb-16">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-extrabold text-white">
            <KeyRound className="size-6 text-pink-400" aria-hidden /> Payment settings
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Keys are stored encrypted and never shown again after saving. Leave a field empty to keep the current key.
          </p>
        </div>

        {/* Status */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-bold text-white">Status</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            <li className="flex flex-wrap items-center gap-2 text-white/80">
              Currencies senders can pay in now:
              {settings.payable.length
                ? settings.payable.map((c) => <span key={c} className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300">{c}</span>)
                : <span className="text-amber-300">none — add a key below</span>}
            </li>
            <li className="text-white/80">
              Test payments (gifts marked paid without charging): {' '}
              <strong className={settings.allow_demo ? 'text-amber-300' : 'text-emerald-300'}>{settings.allow_demo ? 'ON' : 'OFF'}</strong>
            </li>
          </ul>
          {settings.allow_demo && (
            <p className="mt-3 flex gap-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              While test payments are on, any currency without a real provider is "paid" for free. Turn them off before you launch.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {settings.allow_demo ? (
              <button type="button" onClick={() => save({ allow_demo: false })} disabled={saving}
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#07040d] hover:bg-white/90 disabled:opacity-50">
                Turn off test payments
              </button>
            ) : settings.demo_possible ? (
              <button type="button" onClick={() => save({ allow_demo: true })} disabled={saving}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-white hover:bg-white/5 disabled:opacity-50">
                Turn test payments back on (this computer only)
              </button>
            ) : null}
          </div>
        </section>

        {/* Keys */}
        {GROUPS.map((g) => (
          <section key={g.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="font-bold text-white">{g.title}</h2>
            <p className="mt-1 text-sm text-white/60">{g.note}</p>
            <p className="mt-1 text-xs text-white/40">Find the keys in: {g.dashboard}</p>
            <div className="mt-4 grid gap-4">
              {g.keys.map((k) => {
                const f = settings.fields[k];
                if (!f) return null;
                const err = errors?.[`keys.${k}`];
                return (
                  <div key={k}>
                    <label htmlFor={k} className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white/85">
                      {f.label}
                      {f.set ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                          <CheckCircle2 className="size-3" aria-hidden /> saved, ends in {f.ending}
                          {f.mode && <> · {f.mode}</>}
                          {f.source === 'env' && <> · from .env</>}
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white/60">not set</span>
                      )}
                    </label>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        id={k}
                        type="password"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={f.set ? 'Paste a new key to replace it' : 'Paste the key'}
                        value={values[k] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm text-white placeholder:text-white/30 focus:border-pink-400 focus:outline-none"
                      />
                      {f.source === 'console' && (
                        <button type="button" onClick={() => save({ clear: [k] })} disabled={saving}
                          className="rounded-xl border border-white/10 px-3 text-xs font-bold text-white/70 hover:bg-white/5">
                          Remove
                        </button>
                      )}
                    </div>
                    {err && <p className="mt-1 text-xs font-semibold text-rose-300">{err}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => save()} disabled={saving || !Object.values(values).some(Boolean)}
            className="inline-flex items-center gap-2 rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-500 disabled:opacity-40">
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden />} Save keys
          </button>
          <button type="button" onClick={runCheck} disabled={checking || !paystackReady}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/5 disabled:opacity-40">
            {checking && <Loader2 className="size-4 animate-spin" aria-hidden />} Test Paystack connection
          </button>
        </div>
        {check && (
          <p role="status" className={`rounded-xl p-3 text-sm font-semibold ${check.ok ? 'bg-emerald-500/10 text-emerald-200' : 'bg-rose-500/10 text-rose-200'}`}>
            {check.message}
          </p>
        )}

        {/* Webhooks */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-bold text-white">Webhook addresses</h2>
          <p className="mt-1 text-sm text-white/60">
            Paste these into each provider's dashboard so payments are confirmed even if the sender closes the page.
            They must be your live https address once the site is online.
          </p>
          {(['paystack', 'flutterwave'] as const).map((p) => (
            <div key={p} className="mt-3 flex items-center gap-2">
              <span className="w-24 shrink-0 text-sm font-semibold capitalize text-white/80">{p}</span>
              <code className="min-w-0 flex-1 truncate rounded-lg bg-black/30 px-3 py-2 text-xs text-white/80">{settings.webhooks[p]}</code>
              <button type="button" onClick={() => copy(settings.webhooks[p])} aria-label={`Copy ${p} webhook address`}
                className="rounded-lg border border-white/10 p-2 text-white/70 hover:bg-white/5">
                <Copy className="size-4" aria-hidden />
              </button>
            </div>
          ))}
        </section>
      </div>
    </AdminLayout>
  );
}
