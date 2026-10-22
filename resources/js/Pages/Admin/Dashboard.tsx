import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { AdminLayout } from '../../Layouts/AdminLayout';
import { Shield, Gift, DollarSign, Users, Clock, ArrowUpRight, TrendingUp, AlertCircle } from 'lucide-react';

export default function Dashboard({ stats, recent_gifts, recent_payments }: any) {
  return (
    <AdminLayout>
      <Head title="Staff Command Center" />

      <div className="space-y-8 pb-16">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">System Operations Overview</h1>
          <p className="text-xs text-white/60">Live metrics across gift issuance, provider settlements, and pending payouts.</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 rounded-3xl glass-panel-elevated space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white/50">Total Gifts Created</span>
            <p className="text-3xl font-black text-white">{stats.total_gifts}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-pink-400 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{stats.delivered_gifts} unboxed & revealed</span>
            </div>
          </div>

          <div className="p-6 rounded-3xl glass-panel-elevated space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white/50">Settled Volume</span>
            <p className="text-3xl font-black text-emerald-400">${stats.total_volume.toLocaleString()}</p>
            <p className="text-[11px] text-white/50 font-semibold">Escrow confirmed</p>
          </div>

          <div className="p-6 rounded-3xl glass-panel-elevated space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white/50">Pending Wire Payouts</span>
            <p className="text-3xl font-black text-amber-300">{stats.pending_payouts}</p>
            <div className="flex items-center gap-1 text-[11px] text-amber-300 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Requires wire batch release</span>
            </div>
          </div>

          <div className="p-6 rounded-3xl glass-panel-elevated space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white/50">Total Registered Users</span>
            <p className="text-3xl font-black text-white">{stats.users_count}</p>
            <p className="text-[11px] text-white/50 font-semibold">Customer profiles active</p>
          </div>
        </div>

        {/* Recent Activity Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gifts Table */}
          <div className="p-6 rounded-3xl glass-panel-elevated space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-white">Recent Mystery Gifts</h3>
              <Link href="/admin/gifts" className="text-xs font-bold text-pink-400 hover:text-white flex items-center gap-1">
                <span>View Database</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-white/40 border-b border-white/10 uppercase">
                  <tr>
                    <th className="pb-3">Token</th>
                    <th className="pb-3">Sender → Recipient</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recent_gifts.map((g: any) => (
                    <tr key={g.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-mono text-white/70">{g.token}</td>
                      <td className="py-3 font-bold text-white">{g.sender_name} → {g.recipient_name}</td>
                      <td className="py-3 font-bold text-amber-300">{g.currency} {Number(g.amount).toFixed(2)}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                          {g.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments Table */}
          <div className="p-6 rounded-3xl glass-panel-elevated space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-white">Settlement Transactions</h3>
              <Link href="/admin/payments" className="text-xs font-bold text-pink-400 hover:text-white flex items-center gap-1">
                <span>All Payments</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-white/40 border-b border-white/10 uppercase">
                  <tr>
                    <th className="pb-3">Reference</th>
                    <th className="pb-3">Provider</th>
                    <th className="pb-3">Gross</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recent_payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-mono text-white/70 truncate max-w-[120px]">{p.reference}</td>
                      <td className="py-3 uppercase text-white/60 font-bold">{p.provider}</td>
                      <td className="py-3 font-bold text-emerald-400">{p.currency} {Number(p.amount).toFixed(2)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-300'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
