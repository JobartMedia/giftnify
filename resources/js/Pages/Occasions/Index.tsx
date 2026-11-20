import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { AppLayout } from '../../Layouts/AppLayout';
import { Icon3D } from '../../Components/Icon3D';
import { ContactImport, type PhoneContact, type ImportSource } from '../../Components/contacts/ContactImport';
import { GoogleConnect, type GoogleStatus } from '../../Components/contacts/GoogleConnect';
import { Bell, CalendarClock, Cake, Gift, Plus, Sparkles, Trash2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const OCCASIONS = ['Birthday', 'Anniversary', 'Wedding', 'Graduation', 'Other'];
// The cookie always holds the current session's token (the meta tag goes stale after sign-in/sign-up).
const csrfHeaders = (): Record<string, string> => {
  const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
  if (m) return { 'X-XSRF-TOKEN': decodeURIComponent(m[1]) };
  return { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content || '' };
};

interface Person {
  id: string; name: string; first: string; phone?: string | null; email?: string | null; occasion: string;
  on_giftnify: boolean; date_source: 'saved' | 'giftnify' | null; next_date: string | null; date_label: string | null;
  days: number | null; gift_link?: string | null; avatar_url?: string | null;
}
interface Settings { birth_day: number | null; birth_month: number | null; birthday_locked: boolean; birthday_visible: boolean; birthday_reminders: boolean; phone: string | null }

const whenLabel = (d: number) => (d === 0 ? 'Today 🎉' : d === 1 ? 'Tomorrow' : d < 7 ? `In ${d} days` : d < 14 ? 'Next week' : d < 60 ? `In ${Math.round(d / 7)} weeks` : `In ${Math.round(d / 30)} months`);
const giftHref = (p: Person) => {
  const q = new URLSearchParams({ to: p.name, occasion: p.occasion });
  if (p.email || p.phone) q.set('contact', (p.email || p.phone)!);
  if (p.days && p.days > 0 && p.next_date) q.set('opens', p.next_date);
  return `/create?${q}`;
};

function Face({ p, size = 48 }: { p: Person; size?: number }) {
  return p.avatar_url
    ? <img src={p.avatar_url} alt="" className="shrink-0 rounded-2xl object-cover" style={{ width: size, height: size }} />
    : <span className="grid shrink-0 place-items-center rounded-2xl bg-petal font-display font-extrabold text-[#E5007D]" style={{ width: size, height: size, fontSize: size * 0.4 }}>{p.name.charAt(0)}</span>;
}

async function gjson(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { credentials: 'same-origin', ...init, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...csrfHeaders(), ...(init.headers || {}) } });
  const d = await res.json().catch(() => ({}));
  return { res, d };
}

export default function Occasions({ people = [], settings, welcome, leads = [7, 1], google: googleInitial }: { people: Person[]; settings: Settings | null; welcome?: boolean; leads?: number[]; google?: GoogleStatus }) {
  const [google, setGoogle] = useState<GoogleStatus>(googleInitial ?? { available: false, connected: false });
  const justConnected = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('google') === 'contacts';
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', occasion: 'Birthday', day: 0, month: 0 });
  const [range, setRange] = useState<'month' | 'all'>('month');

  const dated = useMemo(() => people.filter((p) => p.days !== null).sort((a, b) => (a.days! - b.days!) || a.name.localeCompare(b.name)), [people]);
  const soon = dated.filter((p) => range === 'all' || p.days! <= 31);
  const undated = people.filter((p) => p.days === null);

  if (!settings) {
    return (
      <AppLayout>
        <Head title="Birthdays & reminders — Giftnify" />
        <div className="mx-auto max-w-md py-14 text-center">
          <Icon3D name="cake" size="lg" />
          <h1 className="mt-6 font-display text-3xl font-extrabold text-ink">Never miss a birthday</h1>
          <p className="mt-2 text-ink-soft">Save the people you love. We'll remind you a week before and the day before, so your gift lands right on time.</p>
          <div className="mt-8 grid gap-2.5">
            <Link href="/register" className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-primary font-extrabold text-white shadow-glow">Create a free account</Link>
            <Link href="/login?redirect=%2Foccasions" className="inline-flex h-12 items-center justify-center rounded-full border border-line font-extrabold text-ink">Sign in</Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const date = form.day && form.month ? `2000-${String(form.month).padStart(2, '0')}-${String(form.day).padStart(2, '0')}` : null;
    router.post('/occasions/contacts', { name: form.name, phone: form.phone || null, email: form.email || null, occasion: form.occasion, occasion_date: date }, {
      preserveScroll: true,
      onSuccess: () => { setAdding(false); setForm({ name: '', phone: '', email: '', occasion: 'Birthday', day: 0, month: 0 }); toast.success('Saved. We\'ll remind you.'); },
    });
  };

  const importRows = async (rows: PhoneContact[], source: ImportSource) => {
    const res = await fetch('/occasions/contacts/import', {
      method: 'POST', credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...csrfHeaders() },
      body: JSON.stringify({ contacts: rows, source }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return { error: d.message || 'That did not save. Try again.' };
    router.reload({ only: ['people'] });
    return d as { added: number; skipped: number };
  };

  const saveSetting = (data: Record<string, string | number | boolean | null>) =>
    router.post('/occasions/settings', data, { preserveScroll: true, preserveState: true, onSuccess: () => toast.success('Saved') });

  const featured = soon[0];
  const sel = 'h-12 w-full min-w-0 rounded-2xl border border-line bg-white px-3 text-sm font-semibold text-ink outline-none focus:border-[#E5007D]';

  return (
    <AppLayout>
      <Head title="Birthdays & reminders — Giftnify" />
      <div className="mx-auto max-w-3xl space-y-8 pb-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Birthdays &amp; reminders</h1>
            <p className="mt-1 text-sm text-ink-soft">We email you {leads.map((d) => (d === 1 ? 'the day before' : `${d} days before`)).join(' and ')} each birthday of the people you save.</p>
          </div>
          <button type="button" onClick={() => setAdding(!adding)} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-extrabold text-white">
            <Plus className="size-4" aria-hidden /> Add one person
          </button>
        </div>

        {welcome && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-plum p-6 text-white">
            <p className="flex items-center gap-2 text-sm font-bold text-[#FFD27A]"><Sparkles className="size-4" aria-hidden /> Welcome to Giftnify</p>
            <p className="mt-2 font-display text-2xl font-extrabold">Who do you never want to forget?</p>
            <p className="mt-1 text-sm text-white/75">Add people from your phone below. Friends already on Giftnify bring their birthdays with them, so you don't have to ask.</p>
          </div>
        )}

        {adding && (
          <form onSubmit={add} className="grid gap-3 rounded-3xl border border-line bg-white p-5 shadow-soft sm:grid-cols-2 sm:p-6">
            <p className="font-display text-lg font-extrabold text-ink sm:col-span-2">Add a person</p>
            <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className={sel} />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone (e.g. 0803 555 0142)" className={sel} inputMode="tel" />
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email (optional)" className={sel} />
            <select value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} className={sel} aria-label="Occasion">
              {OCCASIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
            <select value={form.day} onChange={(e) => setForm({ ...form, day: Number(e.target.value) })} className={sel} aria-label="Day">
              <option value={0}>Day</option>{Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
            </select>
            <select value={form.month} onChange={(e) => setForm({ ...form, month: Number(e.target.value) })} className={sel} aria-label="Month">
              <option value={0}>Month</option>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <p className="text-xs text-ink-soft sm:col-span-2">No date? If they're on Giftnify, we'll use the birthday they shared.</p>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" onClick={() => setAdding(false)} className="h-11 rounded-full px-4 text-sm font-bold text-ink-soft">Cancel</button>
              <button type="submit" className="h-11 rounded-full bg-gradient-primary px-6 text-sm font-extrabold text-white shadow-glow">Save</button>
            </div>
          </form>
        )}

        {/* Coming up */}
        <section aria-labelledby="soon">
          <div className="flex items-center justify-between">
            <h2 id="soon" className="flex items-center gap-2 font-display text-xl font-extrabold text-ink"><CalendarClock className="size-5 text-[#E5007D]" aria-hidden /> Coming up</h2>
            <div className="flex gap-1 rounded-full bg-petal p-1" role="group" aria-label="Range">
              {(['month', 'all'] as const).map((r) => (
                <button key={r} type="button" onClick={() => setRange(r)} aria-pressed={range === r}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${range === r ? 'bg-white text-ink shadow-soft' : 'text-ink-soft'}`}>{r === 'month' ? 'Next 30 days' : 'All year'}</button>
              ))}
            </div>
          </div>

          {featured && (
            <div className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-primary p-6 text-white shadow-glow">
              <div className="absolute right-4 top-4 hidden sm:block"><Icon3D name="cake" size="md" /></div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-white/80">{whenLabel(featured.days!)} · {featured.date_label}</p>
              <p className="mt-1 pr-0 font-display text-2xl font-extrabold sm:pr-24">{featured.first}'s {featured.occasion.toLowerCase()}</p>
              <p className="mt-1 text-sm text-white/85">{featured.days! > 0 ? 'Schedule a mystery gift now. It opens at midnight on the day.' : 'It\'s today. A surprise now would make their day.'}</p>
              <Link href={giftHref(featured)} className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-extrabold text-[#B4005E]">
                <Gift className="size-4" aria-hidden /> {featured.days! > 0 ? `Schedule ${featured.first}'s gift` : `Gift ${featured.first} now`}
              </Link>
            </div>
          )}

          <ul className="mt-3 grid gap-2.5">
            {soon.slice(featured ? 1 : 0).map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 pr-4 shadow-soft ring-1 ring-inset ring-line">
                <Face p={p} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-bold text-ink">{p.name}
                    {p.on_giftnify && <UserCheck className="size-4 shrink-0 text-[#0B7A55]" aria-label="On Giftnify" />}</p>
                  <p className="truncate text-sm text-ink-soft">{p.occasion} · {p.date_label} · <span className="font-bold text-[#B4005E]">{whenLabel(p.days!)}</span></p>
                </div>
                <Link href={giftHref(p)} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-petal px-4 text-sm font-extrabold text-[#B4005E] hover:bg-[#FCE2EF]">
                  <Gift className="size-4" aria-hidden /> Gift
                </Link>
              </li>
            ))}
          </ul>
          {soon.length === 0 && (
            <p className="mt-4 rounded-2xl bg-petal px-5 py-4 text-sm text-ink">
              {people.length === 0 ? 'No one saved yet. Add people from your contacts below.' : range === 'month' ? 'No birthdays in the next 30 days. See "All year".' : 'None of your people have a date yet.'}
            </p>
          )}
        </section>

        <GoogleConnect
          status={google}
          onConnect={(want) => { window.location.href = `/integrations/google/connect?want=${want}`; }}
          onCalendar={async (enabled) => {
            const { res, d } = await gjson('/integrations/google/calendar', { method: 'POST', body: JSON.stringify({ enabled }) });
            if (res.status === 409 && d.needs_connect) { window.location.href = '/integrations/google/connect?want=calendar'; return; }
            if (d.available !== undefined) setGoogle(d);
            if (!res.ok) toast.error(d.message || 'Google Calendar didn\'t respond.'); else toast.success(enabled ? 'Birthdays added to your Google Calendar' : 'Giftnify Birthdays calendar removed');
          }}
          onSync={async () => {
            const { res, d } = await gjson('/integrations/google/sync', { method: 'POST' });
            if (d.available !== undefined) setGoogle(d);
            if (!res.ok) toast.error(d.message || 'Google Calendar didn\'t respond.'); else toast.success('Calendar updated');
          }}
          onDisconnect={async () => {
            const { d } = await gjson('/integrations/google', { method: 'DELETE' });
            if (d.available !== undefined) setGoogle(d);
            toast.success('Google disconnected');
          }}
        />

        <ContactImport
          save={importRows}
          autoGoogle={justConnected}
          google={google.connected && google.contacts ? async () => {
            const { res, d } = await gjson('/integrations/google/contacts');
            if (!res.ok) throw new Error(d.message || 'Google Contacts didn\'t respond.');
            return d.contacts as PhoneContact[];
          } : null}
        />

        {/* Everyone */}
        {people.length > 0 && (
          <section aria-labelledby="everyone">
            <h2 id="everyone" className="font-display text-xl font-extrabold text-ink">Your people <span className="text-base font-bold text-ink-soft">· {people.length}</span></h2>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-inset ring-line">
              {[...dated, ...undated].map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <Face p={p} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{p.name}</p>
                    <p className="truncate text-xs text-ink-soft">
                      {p.date_label ? <>{p.occasion} · {p.date_label}{p.date_source === 'giftnify' && ' · from their Giftnify'}</> : p.on_giftnify ? 'On Giftnify · birthday not shared' : 'No date yet'}
                    </p>
                  </div>
                  <button type="button" aria-label={`Remove ${p.name}`}
                    onClick={() => router.delete(`/occasions/contacts/${p.id}`, { preserveScroll: true })}
                    className="grid size-10 place-items-center rounded-full text-ink-soft hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Settings */}
        <section id="settings" className="rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6" aria-labelledby="settings-title">
          <h2 id="settings-title" className="flex items-center gap-2 font-display text-xl font-extrabold text-ink"><Bell className="size-5 text-[#E5007D]" aria-hidden /> Reminder settings</h2>
          <div className="mt-4 grid gap-4">
            {!settings.birthday_locked ? (
              <BirthdayPrompt onSave={(d, m) => saveSetting({ birth_day: d, birth_month: m })} sel={sel} />
            ) : (
              <p className="flex items-center gap-2 text-sm text-ink"><Cake className="size-4 text-[#E5007D]" aria-hidden /> Your birthday: <strong>{settings.birth_day} {MONTHS[(settings.birth_month ?? 1) - 1]}</strong></p>
            )}
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" defaultChecked={settings.birthday_reminders} onChange={(e) => saveSetting({ birthday_reminders: e.target.checked })} className="mt-0.5 size-5 accent-[#E5007D]" />
              <span><span className="font-bold text-ink">Email me before birthdays</span><br /><span className="text-ink-soft">{leads.map((d) => (d === 1 ? 'the day before' : `${d} days before`)).join(' and ').replace(/^./, (c) => c.toUpperCase())}, at 8am.</span></span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" defaultChecked={settings.birthday_visible} onChange={(e) => saveSetting({ birthday_visible: e.target.checked })} className="mt-0.5 size-5 accent-[#E5007D]" />
              <span><span className="font-bold text-ink">Let people who have my number or email see my birthday</span><br /><span className="text-ink-soft">Only the day and month, so friends can remind themselves to gift you.</span></span>
            </label>
            <PhoneField initial={settings.phone ?? ''} onSave={(phone) => saveSetting({ phone })} sel={sel} />
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function BirthdayPrompt({ onSave, sel }: { onSave: (d: number, m: number) => void; sel: string }) {
  const [d, setD] = useState(0); const [m, setM] = useState(0);
  return (
    <div className="rounded-2xl bg-[#FFF8E6] p-4">
      <p className="text-sm font-bold text-[#7A4B00]">Add your birthday so friends get reminded too</p>
      <div className="mt-3 grid grid-cols-[1fr_1.6fr_auto] gap-2">
        <select value={d} onChange={(e) => setD(Number(e.target.value))} className={sel} aria-label="Day"><option value={0}>Day</option>{Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select>
        <select value={m} onChange={(e) => setM(Number(e.target.value))} className={sel} aria-label="Month"><option value={0}>Month</option>{MONTHS.map((x, i) => <option key={x} value={i + 1}>{x}</option>)}</select>
        <button type="button" disabled={!d || !m} onClick={() => onSave(d, m)} className="h-12 rounded-2xl bg-ink px-4 text-sm font-extrabold text-white disabled:opacity-50">Save</button>
      </div>
      <p className="mt-2 text-xs text-[#7A4B00]/80">It can't be changed later, so check it's right.</p>
    </div>
  );
}

function PhoneField({ initial, onSave, sel }: { initial: string; onSave: (p: string) => void; sel: string }) {
  const [v, setV] = useState(initial);
  return (
    <div>
      <label htmlFor="my-phone" className="text-sm font-bold text-ink">My phone number</label>
      <p className="text-xs text-ink-soft">Friends who saved your number find your birthday with it.</p>
      <div className="mt-2 flex gap-2">
        <input id="my-phone" value={v} onChange={(e) => setV(e.target.value)} inputMode="tel" placeholder="0803 555 0142" className={sel} />
        <button type="button" disabled={v === initial} onClick={() => onSave(v)} className="h-12 shrink-0 rounded-2xl bg-ink px-4 text-sm font-extrabold text-white disabled:opacity-40">Save</button>
      </div>
    </div>
  );
}
