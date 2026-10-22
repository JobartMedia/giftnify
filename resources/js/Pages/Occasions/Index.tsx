import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { AppLayout } from '../../Layouts/AppLayout';
import { Icon3D } from '../../Components/Icon3D';
import { Calendar, Plus, Trash2, Gift, User, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function Occasions({ contacts }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [occasion, setOccasion] = useState('Birthday');
  const [occasionDate, setOccasionDate] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    router.post('/occasions/contacts', {
      name,
      phone,
      email,
      occasion,
      occasion_date: occasionDate || null,
    }, {
      onSuccess: () => {
        setShowAdd(false);
        setName('');
        setPhone('');
        setEmail('');
        setOccasionDate('');
        toast.success('Contact added!');
      },
    });
  };

  const handleDelete = (id: string) => {
    router.delete(`/occasions/contacts/${id}`, {
      onSuccess: () => toast.success('Contact deleted.'),
    });
  };

  return (
    <AppLayout>
      <Head title="Occasions & Reminders — Giftnify" />

      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#251522]">Occasion Reminders</h1>
            <p className="text-sm text-[#7B6674]">Never forget a birthday, anniversary, or special milestone.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(!showAdd)}
            className="px-5 py-2.5 rounded-2xl font-bold bg-gradient-primary text-white text-xs shadow-glow flex items-center gap-2 hover:opacity-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Recipient</span>
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="p-7 sm:p-9 rounded-3xl bg-white border border-[#EADDE5] shadow-soft space-y-4">
            <h3 className="text-base font-extrabold text-[#251522]">Add New Loved One</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-[#EADDE5] bg-white text-xs text-[#251522] placeholder:text-[#A898A3] focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10 outline-none transition"
              />
              <input
                type="text"
                placeholder="Phone (e.g. +234 803 555 0142)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-[#EADDE5] bg-white text-xs text-[#251522] placeholder:text-[#A898A3] focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10 outline-none transition"
              />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-[#EADDE5] bg-white text-xs text-[#251522] placeholder:text-[#A898A3] focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10 outline-none transition"
              />
              <input
                type="date"
                value={occasionDate}
                onChange={(e) => setOccasionDate(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-[#EADDE5] bg-white text-xs text-[#251522] focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10 outline-none transition"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-xl bg-[#FFF0F7] hover:bg-[#FCE2EF] text-[#251522] text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-primary text-white text-xs font-bold shadow-glow hover:opacity-95 transition"
              >
                Save Contact
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((c: any) => (
            <div key={c.id} className="p-6 rounded-3xl bg-white border border-[#EADDE5] shadow-soft flex items-center justify-between hover:border-[#E5007D]/40 transition">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF0F7] border border-[#EADDE5] flex items-center justify-center font-extrabold text-base text-[#E5007D]">
                  {c.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[#251522]">{c.name}</h4>
                  <p className="text-xs text-[#7B6674]">{c.occasion || 'Birthday'} {c.occasion_date ? `· ${c.occasion_date}` : ''}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/create?to=${encodeURIComponent(c.name)}&occasion=${encodeURIComponent(c.occasion || 'Birthday')}`}
                  className="px-3.5 py-2 rounded-xl bg-gradient-primary text-white text-xs font-bold flex items-center gap-1.5 shadow-glow hover:opacity-95 transition"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Send</span>
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="p-2 rounded-xl text-[#7B6674] hover:text-red-500 hover:bg-red-50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
