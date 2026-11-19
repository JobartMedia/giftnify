import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AdminLayout } from '../../Layouts/AdminLayout';
import { toast } from 'sonner';

const money = (a: number, c: string) => {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: c, currencyDisplay: 'narrowSymbol' }).format(a); } catch { return `${c} ${a}`; }
};

const TONE: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300',
  processing: 'bg-sky-500/15 text-sky-300',
  paid: 'bg-emerald-500/15 text-emerald-300',
  failed: 'bg-red-500/15 text-red-300',
  cancelled: 'bg-white/10 text-white/60',
};

const MODE_TEXT: Record<string, string> = {
  manual: 'Pay by hand: send each request yourself, then mark it Paid.',
  approve: 'Paystack after approval: click "Send with Paystack" on Naira bank requests. Everything else is paid by hand.',
  auto: 'Paystack automatically: Naira bank requests are sent the moment the customer asks. Everything else is paid by hand.',
};

export default function Withdrawals({ withdrawals, payout_mode = 'manual', paystack_ready = false }: any) {
  const list = withdrawals?.data || [];
  const [reason, setReason] = useState<Record<string, string>>({});

  const update = (id: string, status: string) => {
    if ((status === 'failed' || status === 'cancelled') && !reason[id]) {
      toast.error('Add a short reason first. The customer sees it.');
      return;
    }
    router.patch(`/admin/withdrawals/${id}`, { status, reason: reason[id] || null }, {
      preserveScroll: true,
      onSuccess: () => toast.success(`Marked ${status}.`),
      onError: () => toast.error('Could not update this withdrawal.'),
    });
  };

  const [busy, setBusy] = useState<string | null>(null);
  const act = (id: string, what: 'send' | 'verify') => {
    setBusy(id + what);
    router.post(`/admin/withdrawals/${id}/${what}`, {}, { preserveScroll: true, onFinish: () => setBusy(null) });
  };

  return (
    <AdminLayout>
      <Head title="Wallet withdrawals" />
      <div className="space-y-6 pb-16">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Wallet withdrawals</h1>
          <p className="text-xs text-white/60">Failed or cancelled requests are refunded to the customer's wallet automatically.</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs">
          <span className="text-white/75"><strong className="text-white">Payout mode:</strong> {MODE_TEXT[payout_mode] ?? MODE_TEXT.manual}</span>
          <a href="/admin/settings/payments#payouts" className="rounded-lg bg-white/10 px-3 py-1.5 font-bold text-white hover:bg-white/15">Change</a>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="border-b border-white/10 text-white/45">
              <tr>
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Send to</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Requested</th>
                <th className="pb-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {list.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-white/45">No withdrawal requests yet.</td></tr>
              ) : list.map((w: any) => {
                const d = w.details || {};
                const open = w.status === 'pending' || w.status === 'processing';
                return (
                  <tr key={w.id} className="align-top">
                    <td className="py-3">
                      <span className="block font-bold text-white">{w.user?.name}</span>
                      <span className="text-white/50">{w.user?.email}</span>
                    </td>
                    <td className="py-3 font-black text-white">{money(w.amount, w.currency)}</td>
                    <td className="py-3 text-white/80">
                      <span className="block font-semibold text-pink-300">{w.method}</span>
                      {w.method === 'Bank Transfer'
                        ? <span>{d.bank} · <span className="font-mono">{d.account}</span><br /><span className="text-white/50">{d.account_name}</span></span>
                        : <span className="font-mono">{d.destination}</span>}
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-1 font-bold ${TONE[w.status] ?? ''}`}>{w.status}</span>
                      {w.payout_channel === 'paystack' && <span className="ml-1 rounded-full bg-sky-500/10 px-2 py-1 font-bold text-sky-300">via Paystack</span>}
                      {w.failure_reason && <span className="mt-1 block text-white/50">{w.failure_reason}</span>}
                    </td>
                    <td className="py-3 text-white/60">{w.created_at ? new Date(w.created_at).toLocaleString() : ''}</td>
                    <td className="py-3 text-right">
                      {open ? (
                        <div className="flex flex-col items-end gap-2">
                          {payout_mode !== 'manual' && paystack_ready && w.paystack_eligible && w.status === 'pending' && !w.sent_with_paystack && (
                            <button disabled={!!busy} onClick={() => act(w.id, 'send')} className="rounded-lg bg-pink-600 px-3 py-1.5 font-bold text-white hover:bg-pink-500 disabled:opacity-50">
                              {busy === w.id + 'send' ? 'Sending…' : 'Send with Paystack'}
                            </button>
                          )}
                          {w.sent_with_paystack && (
                            <button disabled={!!busy} onClick={() => act(w.id, 'verify')} className="rounded-lg bg-sky-500/20 px-3 py-1.5 font-bold text-sky-200 hover:bg-sky-500/30 disabled:opacity-50">
                              {busy === w.id + 'verify' ? 'Checking…' : 'Check Paystack status'}
                            </button>
                          )}
                          <div className="flex gap-1.5">
                            {w.status === 'pending' && <button onClick={() => update(w.id, 'processing')} className="rounded-lg bg-white/10 px-2.5 py-1.5 font-bold text-white hover:bg-white/15">Processing</button>}
                            <button onClick={() => update(w.id, 'paid')} className="rounded-lg bg-emerald-500/20 px-2.5 py-1.5 font-bold text-emerald-200 hover:bg-emerald-500/30">Paid</button>
                            <button onClick={() => update(w.id, 'failed')} className="rounded-lg bg-red-500/15 px-2.5 py-1.5 font-bold text-red-200 hover:bg-red-500/25">Failed</button>
                          </div>
                          <input
                            aria-label="Reason if failed"
                            placeholder="Reason if failed"
                            value={reason[w.id] || ''}
                            onChange={(e) => setReason({ ...reason, [w.id]: e.target.value })}
                            className="w-48 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-white placeholder:text-white/35"
                          />
                        </div>
                      ) : <span className="text-white/40">Done</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
