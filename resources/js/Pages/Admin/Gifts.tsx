import React from 'react';
import { Head, router } from '@inertiajs/react';
import { AdminLayout } from '../../Layouts/AdminLayout';
import { Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Gifts({ gifts }: any) {
  const list = gifts?.data || [];

  const handleStatusChange = (id: string, newStatus: string) => {
    router.patch(`/admin/gifts/${id}`, { status: newStatus }, {
      onSuccess: () => toast.success('Status updated.'),
      onError: () => toast.error('Could not update status.'),
    });
  };

  const STATUS_LIST = [
    'Awaiting Payment',
    'Preparing',
    'Sent',
    'Opened',
    'Message Viewed',
    'Unlocked',
    'Redeemed',
    'Refunded',
    'Cancelled'
  ];

  return (
    <AdminLayout>
      <Head title="Staff Gift Management" />

      <div className="space-y-6 pb-16">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">Gifts Database</h1>
            <p className="text-xs text-white/60">Inspect and manage live gift tokens and delivery lifecycles.</p>
          </div>
        </div>

        <div className="p-6 rounded-3xl glass-panel-elevated overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-white/40 border-b border-white/10 uppercase">
              <tr>
                <th className="pb-3">Token</th>
                <th className="pb-3">From → To</th>
                <th className="pb-3">Channel</th>
                <th className="pb-3">Value</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {list.map((g: any) => (
                <tr key={g.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 font-mono text-white/70">{g.token}</td>
                  <td className="py-3 font-bold text-white">{g.sender_name} → {g.recipient_name}</td>
                  <td className="py-3 text-white/70">{g.delivery}</td>
                  <td className="py-3 font-bold text-amber-300">{g.currency} {Number(g.amount).toFixed(2)}</td>
                  <td className="py-3">
                    <select
                      value={g.status}
                      onChange={(e) => handleStatusChange(g.id, e.target.value)}
                      className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-white text-[11px]"
                    >
                      {STATUS_LIST.map((st) => (
                        <option key={st} value={st} className="text-black bg-white">{st}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 text-white/40">{new Date(g.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
