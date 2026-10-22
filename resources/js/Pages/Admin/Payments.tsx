import React from 'react';
import { Head } from '@inertiajs/react';
import { AdminLayout } from '../../Layouts/AdminLayout';
import { CreditCard, DollarSign, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function Payments({ payments }: any) {
  const list = payments?.data || [];

  return (
    <AdminLayout>
      <Head title="Staff Payments & Settlement" />

      <div className="space-y-6 pb-16">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Payments & Settlement Ledger</h1>
          <p className="text-xs text-white/60">Audit trail of all checkout sessions, webhook settlements, and gateway IDs.</p>
        </div>

        <div className="p-6 rounded-3xl glass-panel-elevated overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-white/40 border-b border-white/10 uppercase">
              <tr>
                <th className="pb-3">Payment Reference</th>
                <th className="pb-3">Gift Token</th>
                <th className="pb-3">Provider</th>
                <th className="pb-3">Gateway Ref</th>
                <th className="pb-3">Principal</th>
                <th className="pb-3">Platform Fee</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Settled At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-white/40">
                    No payment records yet.
                  </td>
                </tr>
              ) : (
                list.map((p: any) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 font-mono text-white/80 select-all font-bold">{p.reference}</td>
                    <td className="py-3 font-mono text-white/60">{p.gift_token}</td>
                    <td className="py-3 uppercase font-bold text-pink-400">{p.provider}</td>
                    <td className="py-3 font-mono text-white/40 text-[11px] truncate max-w-[120px]">
                      {p.provider_ref || '—'}
                    </td>
                    <td className="py-3 font-bold text-white">
                      {p.currency} {Number(p.amount).toFixed(2)}
                    </td>
                    <td className="py-3 text-white/60 font-semibold">
                      +{p.currency} {Number(p.fee).toFixed(2)}
                    </td>
                    <td className="py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : p.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-white/40">
                      {p.paid_at ? new Date(p.paid_at).toLocaleString() : 'Pending'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
