import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AdminLayout } from '../../Layouts/AdminLayout';
import { Tag, Plus, Check, Clock, Percent } from 'lucide-react';
import { toast } from 'sonner';

export default function Promos({ promos }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [code, setCode] = useState('');
  const [percentOff, setPercentOff] = useState(10);
  const [maxUses, setMaxUses] = useState<number | ''>('');
  const [expiresAt, setExpiresAt] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    router.post('/admin/promos', {
      code,
      percent_off: Number(percentOff),
      max_uses: maxUses ? Number(maxUses) : null,
      expires_at: expiresAt || null,
    }, {
      onSuccess: () => {
        setShowAdd(false);
        setCode('');
        setPercentOff(10);
        setMaxUses('');
        setExpiresAt('');
        toast.success('Promo code created!');
      },
      onError: (errs) => {
        toast.error(Object.values(errs)[0] as string || 'Could not create promo code.');
      },
    });
  };

  return (
    <AdminLayout>
      <Head title="Staff Promo Codes" />

      <div className="space-y-6 pb-16">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Promotional Campaign Codes</h1>
            <p className="text-xs text-white/60">Generate and monitor checkout discount codes.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(!showAdd)}
            className="px-5 py-2.5 rounded-2xl font-bold bg-gradient-button text-white text-xs shadow-md flex items-center gap-2 hover:scale-105 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Promo Code</span>
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleCreate} className="p-6 rounded-3xl glass-panel-elevated space-y-4">
            <h3 className="text-base font-bold text-white">New Discount Code</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-white/60 uppercase mb-1">Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP25"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-2xl glass-input text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/60 uppercase mb-1">Discount %</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={percentOff}
                  onChange={(e) => setPercentOff(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-2xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/60 uppercase mb-1">Max Uses (Optional)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Unlimited if blank"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-3 rounded-2xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/60 uppercase mb-1">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl glass-input text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-button text-white text-xs font-bold"
              >
                Save Promo Code
              </button>
            </div>
          </form>
        )}

        <div className="p-6 rounded-3xl glass-panel-elevated overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-white/40 border-b border-white/10 uppercase">
              <tr>
                <th className="pb-3">Code</th>
                <th className="pb-3">Percent Off</th>
                <th className="pb-3">Uses / Max</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Expires At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {promos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-white/40">
                    No promo codes created yet.
                  </td>
                </tr>
              ) : (
                promos.map((p: any) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 font-mono font-bold text-pink-400 select-all text-sm">{p.code}</td>
                    <td className="py-3 font-bold text-white text-sm">{p.percent_off}% OFF</td>
                    <td className="py-3 text-white/70">
                      {p.uses} / {p.max_uses ?? '∞'}
                    </td>
                    <td className="py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        p.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/10 text-white/40'
                      }`}>
                        {p.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 text-white/40">
                      {p.expires_at ? new Date(p.expires_at).toLocaleDateString() : 'Never expires'}
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
