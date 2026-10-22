import React from 'react';
import { Head, router } from '@inertiajs/react';
import { AdminLayout } from '../../Layouts/AdminLayout';
import { Landmark, CheckCircle, Clock, XCircle, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

export default function Redemptions({ redemptions }: any) {
  const list = redemptions?.data || [];

  const handleUpdate = (id: string, newStatus: string) => {
    router.patch(`/admin/redemptions/${id}`, { payout_status: newStatus }, {
      onSuccess: () => toast.success('Payout status updated!'),
      onError: () => toast.error('Could not update payout status.'),
    });
  };

  const STATUSES = ['pending', 'processing', 'completed', 'failed', 'cancelled'];

  return (
    <AdminLayout>
      <Head title="Staff Payout Redemptions" />

      <div className="space-y-6 pb-16">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Recipient Cash Redemptions</h1>
          <p className="text-xs text-white/60">Review wire bank account details, process external payouts, and update disbursement status.</p>
        </div>

        <div className="p-6 rounded-3xl glass-panel-elevated overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-white/40 border-b border-white/10 uppercase">
              <tr>
                <th className="pb-3">Gift Token</th>
                <th className="pb-3">Disbursement Method</th>
                <th className="pb-3">Account / Target Info</th>
                <th className="pb-3">Gift Value</th>
                <th className="pb-3">Payout Status</th>
                <th className="pb-3">Created</th>
                <th className="pb-3 text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-white/40">
                    No redemption requests currently pending.
                  </td>
                </tr>
              ) : (
                list.map((r: any) => {
                  const details = r.details || {};
                  return (
                    <tr key={r.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-mono font-bold text-white/80">{r.gift_token}</td>
                      <td className="py-3 font-semibold text-pink-400">{r.method}</td>
                      <td className="py-3">
                        {r.method === 'Bank Transfer' ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-white block">{details.bank} · {details.account}</span>
                            <span className="text-[11px] text-white/50">{details.account_name}</span>
                          </div>
                        ) : (
                          <span className="font-mono text-white/80">{details.destination || '—'}</span>
                        )}
                      </td>
                      <td className="py-3 font-bold text-amber-300">
                        {r.gift ? `${r.gift.currency} ${Number(r.gift.amount).toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.payout_status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : r.payout_status === 'processing'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : r.payout_status === 'failed' || r.payout_status === 'cancelled'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}>
                          {r.payout_status}
                        </span>
                      </td>
                      <td className="py-3 text-white/40">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <select
                          value={r.payout_status}
                          onChange={(e) => handleUpdate(r.id, e.target.value)}
                          className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-white text-[11px]"
                        >
                          {STATUSES.map((st) => (
                            <option key={st} value={st} className="text-black bg-white">{st}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
