import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Crown, Gift, Loader2, MapPin, Share2, Sparkles, Trophy, UserPlus, X } from 'lucide-react';

/**
 * Birthday leaderboard ("Most Gifted in October"). Framework-free; the website
 * and the app pass data and adapters. Keep both copies identical:
 *   resources/js/Components/leaderboard/LeaderboardView.tsx
 *   src/components/giftnify/leaderboard/LeaderboardView.tsx
 */

export interface BoardEntry {
  rank: number; name: string; first: string; avatar_url?: string | null; city?: string | null; country?: string | null;
  birthday?: string | null; points: number; gifts: number; gifters: number; link?: string | null; username?: string | null;
}
export interface MyRank extends BoardEntry {
  total: number; month: number; month_name: string; year: number; phase: 'upcoming' | 'live' | 'past';
  days_to_birthday: number; shown: boolean; target: { top: number; gifts: number } | null;
  above: { name: string; rank: number; gifts_ahead: number } | null; birth_day: number; own_link?: string | null;
}
export interface BoardFilters { month: number; year: number | 'all'; today: boolean; limit: number }
export interface BoardData {
  filters: BoardFilters; title: string; today_label: string; years: number[];
  board: { total: number; entries: BoardEntry[] };
  signed_in: boolean; me: MyRank | null; birthday_locked: boolean;
  profile: { city?: string | null; country?: string | null; shown: boolean; name: string } | null;
  rules: { window_days: number; per_gift: number; bonus_cap: number; max_per_sender: number };
}
export interface BirthdayInput { birth_day?: number; birth_month?: number; city: string; country: string; shown: boolean }

interface Props {
  data: BoardData;
  loading?: boolean;
  onFilter: (f: BoardFilters) => void;
  saveBirthday: (input: BirthdayInput) => Promise<{ ok: boolean; error?: string; me?: MyRank | null }>;
  signInHref: string;
  registerHref: string;
  /** Where a creator sets up their gift link. */
  giftLinkHref: string;
  /** Public URL of the leaderboard, used when someone has no gift link yet. */
  boardUrl: string;
  /** Link for the gift icon beside someone on the board. */
  sendHref?: (e: BoardEntry) => string | null;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const COUNTRIES: [string, string][] = [['NG', 'Nigeria'], ['GH', 'Ghana'], ['KE', 'Kenya'], ['ZA', 'South Africa'], ['GB', 'United Kingdom'], ['US', 'United States'], ['CA', 'Canada'], ['IE', 'Ireland']];

export function flag(code?: string | null) {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...code.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
const fmt = (n: number) => n.toLocaleString();

function Face({ e, size, ring }: { e: Pick<BoardEntry, 'avatar_url' | 'first'>; size: number; ring?: string }) {
  const style = { width: size, height: size };
  return e.avatar_url
    ? <img src={e.avatar_url} alt="" style={style} className={`shrink-0 rounded-full object-cover ${ring ?? ''}`} />
    : <span style={{ ...style, fontSize: size * 0.4 }} className={`grid shrink-0 place-items-center rounded-full bg-gradient-primary font-display font-extrabold text-white ${ring ?? ''}`}>{(e.first || '?').slice(0, 1)}</span>;
}

const PODIUM = {
  1: { crown: '#F5B301', label: '1st', block: 'h-36 bg-gradient-to-b from-[#FFE9A8] to-[#F2C14E]', ribbon: 'bg-[#E9A400]', size: 92 },
  2: { crown: '#A9B4C2', label: '2nd', block: 'h-28 bg-gradient-to-b from-[#F1F3F6] to-[#C9D0DA]', ribbon: 'bg-[#8E99A8]', size: 76 },
  3: { crown: '#C77B3B', label: '3rd', block: 'h-24 bg-gradient-to-b from-[#F8D9C0] to-[#D9925A]', ribbon: 'bg-[#B4672C]', size: 76 },
} as const;

function Podium({ entries }: { entries: BoardEntry[] }) {
  const order = [entries[1], entries[0], entries[2]];
  return (
    <div className="mt-6 grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label="Top 3">
      {order.map((e, i) => {
        const place = (i === 1 ? 1 : i === 0 ? 2 : 3) as 1 | 2 | 3;
        const p = PODIUM[place];
        if (!e) return <div key={place} />;
        return (
          <div key={place} className="flex min-w-0 flex-col items-center text-center">
            <Crown className="size-8" style={{ color: p.crown }} fill={p.crown} aria-hidden />
            <span className={`-mt-1 rounded-md px-2.5 py-0.5 text-xs font-extrabold text-white shadow ${p.ribbon}`}>{p.label}</span>
            <div className="relative z-10 mt-2">
              <Face e={e} size={p.size} ring="ring-4 ring-white shadow-soft" />
            </div>
            <div className={`-mt-6 w-full rounded-t-2xl px-1.5 pb-3 pt-8 shadow-soft ${p.block}`}>
              <p className="line-clamp-2 break-words text-sm font-extrabold leading-tight text-ink sm:text-base">{e.name}</p>
              <p className="mt-0.5 text-xs font-bold text-[#7A4B00] sm:text-sm">+{fmt(e.points)} pts {flag(e.country)}</p>
              <p className="text-[11px] font-semibold text-ink/60">{e.gifts} {e.gifts === 1 ? 'gift' : 'gifts'}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 26 }, (_, i) => ({
    left: (i * 37) % 100, top: (i * 53) % 100, rot: (i * 47) % 180,
    color: ['#E5007D', '#F5B301', '#14A38B', '#6C4DF6', '#FF7A59'][i % 5], w: 6 + (i % 3) * 3,
  })), []);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b, i) => (
        <span key={i} className="absolute rounded-sm opacity-70" style={{ left: `${b.left}%`, top: `${b.top}%`, width: b.w, height: 4, background: b.color, transform: `rotate(${b.rot}deg)` }} />
      ))}
    </div>
  );
}

/** A 1080×1920 picture for WhatsApp Status. */
async function rankImage(me: MyRank, url: string): Promise<Blob | null> {
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1920;
  const x = c.getContext('2d');
  if (!x) return null;
  const g = x.createLinearGradient(0, 0, 1080, 1920);
  g.addColorStop(0, '#2A0B1F'); g.addColorStop(0.55, '#5B1240'); g.addColorStop(1, '#E5007D');
  x.fillStyle = g; x.fillRect(0, 0, 1080, 1920);
  const colors = ['#FFD27A', '#FF7AB8', '#7CE0C3', '#B9A5FF', '#FFFFFF'];
  for (let i = 0; i < 90; i++) {
    x.save(); x.translate((i * 137) % 1080, (i * 251) % 1920); x.rotate(i);
    x.fillStyle = colors[i % 5]; x.globalAlpha = 0.55; x.fillRect(0, 0, 14 + (i % 3) * 6, 8); x.restore();
  }
  x.globalAlpha = 1; x.textAlign = 'center'; x.fillStyle = '#FFFFFF';
  const font = (w: number, s: number) => `${w} ${s}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  x.font = font(800, 64); x.fillText('🎁 Giftnify', 540, 230);
  x.font = font(700, 54); x.fillStyle = '#FFD27A'; x.fillText(`Most Gifted in ${me.month_name}`, 540, 470);
  x.fillStyle = '#FFFFFF'; x.font = font(900, 300); x.fillText(`#${me.rank}`, 540, 800);
  x.font = font(600, 46); x.fillStyle = 'rgba(255,255,255,0.8)'; x.fillText(`out of ${fmt(me.total)} ${me.month_name} celebrants`, 540, 890);
  x.fillStyle = '#FFFFFF'; x.font = font(800, 64);
  x.fillText(me.gifters > 0 ? `${me.gifters} ${me.gifters === 1 ? 'person' : 'people'} gifted me!` : 'My birthday week is here!', 540, 1080);
  if (me.target) { x.font = font(700, 52); x.fillStyle = '#FFD27A'; x.fillText(`Help me reach Top ${me.target.top} 🙏`, 540, 1180); }
  x.fillStyle = 'rgba(255,255,255,0.12)';
  x.beginPath(); (x as any).roundRect ? (x as any).roundRect(140, 1420, 800, 170, 85) : x.rect(140, 1420, 800, 170); x.fill();
  x.fillStyle = '#FFFFFF'; x.font = font(700, 44);
  const link = url.replace(/^https?:\/\//, '');
  x.fillText(link.length > 34 ? link.slice(0, 33) + '…' : link, 540, 1520);
  x.font = font(600, 38); x.fillStyle = 'rgba(255,255,255,0.75)'; x.fillText('Send me a mystery gift 🎉', 540, 1700);
  return new Promise((r) => c.toBlob((b) => r(b), 'image/png'));
}

function shareText(me: MyRank, url: string) {
  const goal = me.target ? ` Help me reach Top ${me.target.top} 🎁` : ' 🎁';
  const count = me.gifters > 0 ? ` ${me.gifters} ${me.gifters === 1 ? 'person has' : 'people have'} gifted me!` : '';
  return `I'm #${me.rank} Most Gifted in ${me.month_name} on Giftnify! 🎉${count}${goal} ${url}`;
}

function RankCard({ me, boardUrl, giftLinkHref, onClose }: { me: MyRank; boardUrl: string; giftLinkHref: string; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const url = me.own_link || boardUrl;

  const status = async () => {
    setBusy(true); setNote(null);
    try {
      const blob = await rankImage(me, url);
      const text = shareText(me, url);
      const file = blob ? new File([blob], `giftnify-rank-${me.rank}.png`, { type: 'image/png' }) : null;
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (file && nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text, title: 'My Giftnify rank' });
        return;
      }
      // Desktop or no file sharing: save the picture, then open WhatsApp with the text.
      if (blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = file?.name || 'giftnify-rank.png'; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      setNote('Picture saved. Post it on your Status with the message.');
    } catch { /* share sheet closed */ } finally { setBusy(false); }
  };

  const invite = async () => {
    const text = `It's my birthday month on Giftnify 🎂 Send me a mystery gift and help me climb the leaderboard! ${url}`;
    try {
      if (navigator.share) { await navigator.share({ text, url }); return; }
      await navigator.clipboard.writeText(text); setNote('Invite copied. Paste it to your friends.');
    } catch { /* closed */ }
  };

  const head = me.phase === 'upcoming'
    ? `Your birthday is in ${me.days_to_birthday} ${me.days_to_birthday === 1 ? 'day' : 'days'}`
    : me.phase === 'past' ? `Your ${me.month_name} birthday week` : 'It’s your birthday week! 🎂';

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/50 p-0 backdrop-blur-sm sm:place-items-center sm:p-6" role="dialog" aria-modal aria-labelledby="rank-title" onClick={onClose}>
      <div className="relative w-full max-w-md overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]" onClick={(e) => e.stopPropagation()}>
        <div className="relative overflow-hidden bg-gradient-plum px-6 pb-7 pt-8 text-center text-white">
          <Confetti />
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-5" aria-hidden /></button>
          <p className="relative text-sm font-bold text-white/70">{head}</p>
          <p id="rank-title" className="relative mt-2 font-display text-7xl font-extrabold tracking-tight">#{me.rank}</p>
          <p className="relative mt-1 text-lg font-extrabold text-[#FFD27A]">Most Gifted in {me.month_name}! 🎉</p>
          <p className="relative mt-1 text-sm text-white/70">out of {fmt(me.total)} {me.month_name} celebrants</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[['Gifts', me.gifts], ['Gifters', me.gifters], ['Points', me.points]].map(([l, v]) => (
              <div key={l as string} className="rounded-2xl bg-petal px-2 py-3">
                <p className="font-display text-2xl font-extrabold text-ink">{fmt(v as number)}</p>
                <p className="text-xs font-bold text-ink-soft">{l}</p>
              </div>
            ))}
          </div>
          {me.target && (
            <p className="mt-4 rounded-2xl border border-[#F5B301]/40 bg-[#FFF8E6] px-4 py-3 text-sm font-bold text-[#7A4B00]">
              🔥 About {me.target.gifts} more {me.target.gifts === 1 ? 'gift' : 'gifts'} to enter the Top {me.target.top}!
            </p>
          )}
          {me.above && (
            <p className="mt-2 text-sm text-ink-soft">
              <span className="font-bold text-ink">{me.above.name}</span> is #{me.above.rank}, about {me.above.gifts_ahead} {me.above.gifts_ahead === 1 ? 'gift' : 'gifts'} ahead of you. Catch up?
            </p>
          )}
          {!me.shown && <p className="mt-2 text-xs font-semibold text-ink-soft">You're hidden from the public board. Only you can see this rank.</p>}

          <div className="mt-5 grid gap-2.5">
            <button type="button" onClick={status} disabled={busy}
              className="inline-flex h-13 min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 font-extrabold text-white shadow-soft transition hover:brightness-105 disabled:opacity-70">
              {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Share2 className="size-5" aria-hidden />} Share to WhatsApp Status
            </button>
            <button type="button" onClick={invite} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-line bg-white px-5 font-extrabold text-ink hover:bg-petal">
              <UserPlus className="size-5" aria-hidden /> Invite friends to gift you
            </button>
            {!me.own_link && (
              <a href={giftLinkHref} className="text-center text-sm font-bold text-[#B4005E] hover:underline">
                Get your own gift link so friends can gift you in one tap →
              </a>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-ink-soft">{note || 'On your phone, pick WhatsApp, then “My status”.'}</p>
        </div>
      </div>
    </div>
  );
}

function BirthdayForm({ data, saveBirthday, onSaved }: { data: BoardData; saveBirthday: Props['saveBirthday']; onSaved: (me: MyRank | null | undefined) => void }) {
  const locked = data.birthday_locked;
  const [day, setDay] = useState(data.me?.birth_day ?? 0);
  const [month, setMonth] = useState(data.me?.month ?? 0);
  const [city, setCity] = useState(data.profile?.city ?? '');
  const [country, setCountry] = useState(data.profile?.country ?? 'NG');
  const [shown, setShown] = useState(data.profile?.shown ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!locked && (!day || !month)) { setError('Pick your birthday day and month.'); return; }
    setBusy(true); setError(null);
    const r = await saveBirthday({ ...(locked ? {} : { birth_day: day, birth_month: month }), city, country, shown });
    setBusy(false);
    if (!r.ok) { setError(r.error || 'That did not save. Try again.'); return; }
    onSaved(r.me);
  };

  const sel = 'h-12 w-full rounded-2xl border border-line bg-white px-3 font-semibold text-ink outline-none focus:border-[#E5007D]';
  return (
    <form onSubmit={submit} className="mt-4 grid gap-3">
      <p className="text-sm text-ink-soft">Ranked as <span className="font-bold text-ink">{data.profile?.name}</span></p>
      {locked ? (
        <p className="flex items-center gap-2 rounded-2xl bg-petal px-4 py-3 text-sm font-bold text-ink">
          <CalendarDays className="size-4 text-[#E5007D]" aria-hidden /> Birthday: {data.me?.birth_day} {data.me?.month_name}
          <span className="ml-auto text-xs font-semibold text-ink-soft">Locked</span>
        </p>
      ) : (
        <div className="grid grid-cols-[1fr_1.6fr] gap-2">
          <label className="grid gap-1 text-xs font-bold text-ink-soft">Day
            <select className={sel} value={day} onChange={(e) => setDay(Number(e.target.value))} required>
              <option value={0}>DD</option>
              {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-ink-soft">Month
            <select className={sel} value={month} onChange={(e) => setMonth(Number(e.target.value))} required>
              <option value={0}>Month</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </label>
        </div>
      )}
      <div className="grid grid-cols-[1.4fr_1fr] gap-2">
        <label className="grid gap-1 text-xs font-bold text-ink-soft">City (optional)
          <input className={sel} value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} placeholder="e.g. Lagos" />
        </label>
        <label className="grid gap-1 text-xs font-bold text-ink-soft">Country
          <select className={sel} value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{flag(c)} {n}</option>)}
          </select>
        </label>
      </div>
      <label className="flex items-start gap-2.5 text-sm text-ink">
        <input type="checkbox" checked={shown} onChange={(e) => setShown(e.target.checked)} className="mt-0.5 size-4 accent-[#E5007D]" />
        <span><span className="font-bold">Show me on the public leaderboard</span><br /><span className="text-xs text-ink-soft">Your name, photo, city and points. Never amounts or your birth year.</span></span>
      </label>
      {!locked && <p className="text-xs text-ink-soft">Your birthday is locked once saved, so nobody can move theirs to stay on top. Made a mistake? Contact support.</p>}
      {error && <p role="alert" className="text-sm font-bold text-[#A12B2B]">{error}</p>}
      <button type="submit" disabled={busy}
        className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-primary px-5 font-extrabold text-white shadow-glow disabled:opacity-70">
        {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Sparkles className="size-5" aria-hidden />} {locked ? 'Save and see my rank' : 'Check my rank'}
      </button>
    </form>
  );
}

export function LeaderboardView({ data, loading, onFilter, saveBirthday, signInHref, registerHref, giftLinkHref, boardUrl, sendHref }: Props) {
  const [me, setMe] = useState<MyRank | null>(data.me);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  useEffect(() => setMe(data.me), [data.me]);

  const f = data.filters;
  const entries = data.board.entries;
  const top = entries.slice(0, 3);
  const rest = entries.slice(3);
  const set = (p: Partial<BoardFilters>) => onFilter({ ...f, ...p });
  const chip = (on: boolean) => `shrink-0 rounded-full px-3.5 py-2 text-sm font-bold transition ${on ? 'bg-ink text-white' : 'bg-white text-ink ring-1 ring-inset ring-line hover:bg-petal'}`;
  const sel = 'h-10 shrink-0 rounded-full border border-line bg-white px-3 text-sm font-bold text-ink outline-none focus:border-[#E5007D]';

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#FFF4FA] via-white to-white px-4 pb-6 pt-8 ring-1 ring-inset ring-line sm:px-8">
        <Confetti />
        <div className="relative text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#B4005E] shadow-soft">
            <Trophy className="size-3.5" aria-hidden /> Birthday Leaderboard
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Most Gifted · {data.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">Who got the most love in their birthday week. Today is {data.today_label}.</p>
          {me && !open && (
            <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-extrabold text-white">
              You're #{me.rank} in {me.month_name} · See card
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="relative mt-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filters">
          <button type="button" className={chip(f.today)} onClick={() => set({ today: !f.today })}>🎂 Today's birthdays</button>
          <select aria-label="Month" className={sel} value={f.month} disabled={f.today} onChange={(e) => set({ month: Number(e.target.value), today: false })}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select aria-label="Year" className={sel} value={String(f.year)} disabled={f.today} onChange={(e) => set({ year: e.target.value === 'all' ? 'all' : Number(e.target.value) })}>
            {data.years.map((y) => <option key={y} value={y}>{y}</option>)}
            <option value="all">All time</option>
          </select>
          <select aria-label="How many" className={sel} value={f.limit} onChange={(e) => set({ limit: Number(e.target.value) })}>
            <option value={10}>Top 10</option>
            <option value={100}>Top 100</option>
            <option value={500}>Top 500</option>
          </select>
          {loading && <Loader2 className="my-auto size-5 shrink-0 animate-spin text-ink-soft" aria-label="Loading" />}
        </div>

        {top.length > 0 ? <Podium entries={top} /> : (
          <div className="relative mt-8 rounded-3xl bg-white/80 px-6 py-10 text-center ring-1 ring-inset ring-line">
            <Gift className="mx-auto size-10 text-[#E5007D]" aria-hidden />
            <p className="mt-3 font-display text-xl font-extrabold text-ink">No one on this board yet</p>
            <p className="mt-1 text-sm text-ink-soft">Gifts that land in someone's birthday week put them here. Be the first.</p>
          </div>
        )}
      </section>

      {rest.length > 0 && (
        <section className="mt-6" aria-labelledby="rankings">
          <div className="flex items-center justify-between px-1">
            <h2 id="rankings" className="font-display text-xl font-extrabold text-ink">Top rankings ✨</h2>
            <span className="text-sm font-bold text-ink-soft">{fmt(data.board.total)} celebrants</span>
          </div>
          <ol className="mt-3 grid gap-2.5">
            {rest.map((e) => {
              const href = sendHref?.(e);
              return (
                <li key={e.rank} className="flex items-center gap-3 rounded-2xl bg-white p-3 pr-4 shadow-soft ring-1 ring-inset ring-line">
                  <span className="w-8 shrink-0 text-center font-display text-lg font-extrabold text-ink">{e.rank}</span>
                  <Face e={e} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{e.name} {flag(e.country)}</p>
                    <p className="flex items-center gap-1 truncate text-sm text-ink-soft">
                      {e.city && <><MapPin className="size-3.5 shrink-0" aria-hidden />{e.city} · </>}{fmt(e.points)} pts · {e.gifts} {e.gifts === 1 ? 'gift' : 'gifts'}
                    </p>
                  </div>
                  {href && (
                    <a href={href} aria-label={`Send ${e.first} a gift`} className="grid size-11 shrink-0 place-items-center rounded-full bg-petal text-[#E5007D] hover:bg-[#FCE2EF]">
                      <Gift className="size-5" aria-hidden />
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Check your rank */}
      <section className="mt-8 rounded-[2rem] bg-gradient-to-br from-[#FFF0F7] via-white to-[#FFF8E6] p-6 shadow-soft ring-1 ring-inset ring-line" aria-labelledby="check">
        <h2 id="check" className="flex items-center gap-2 font-display text-xl font-extrabold text-ink"><Gift className="size-5 text-[#E5007D]" aria-hidden /> Check your rank</h2>
        {!data.signed_in ? (
          <>
            <p className="mt-1 text-sm text-ink-soft">Sign in so we can count the gifts sent to you. Nobody can look you up by name and birthday.</p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <a href={signInHref} className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-gradient-primary px-5 font-extrabold text-white shadow-glow">Sign in to check</a>
              <a href={registerHref} className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-line bg-white px-5 font-extrabold text-ink">Create an account</a>
            </div>
          </>
        ) : me && !editing ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-ink-soft"><span className="font-display text-3xl font-extrabold text-ink">#{me.rank}</span> in {me.month_name} · {me.gifts} {me.gifts === 1 ? 'gift' : 'gifts'} · {fmt(me.points)} pts</p>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => setEditing(true)} className="rounded-full px-4 py-2 text-sm font-bold text-ink-soft hover:text-ink">Settings</button>
              <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-[#25D366] px-4 py-2 text-sm font-extrabold text-white">Share my rank</button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-soft">Gifts sent to you from {data.rules.window_days} days before to {data.rules.window_days} days after your birthday count.</p>
            <BirthdayForm data={data} saveBirthday={saveBirthday} onSaved={(m) => { setEditing(false); if (m) { setMe(m); setOpen(true); } }} />
          </>
        )}
      </section>

      <details className="mt-6 rounded-2xl bg-white px-5 py-4 text-sm text-ink-soft ring-1 ring-inset ring-line">
        <summary className="cursor-pointer font-bold text-ink">How points work</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Each gift in your birthday week: {data.rules.per_gift} points.</li>
          <li>Bonus for the gift's value: up to {data.rules.bonus_cap} more points. Amounts are never shown.</li>
          <li>Up to {data.rules.max_per_sender} gifts from the same person count, so more friends beat one big spender.</li>
          <li>The board updates every few minutes.</li>
        </ul>
      </details>

      {open && me && <RankCard me={me} boardUrl={boardUrl} giftLinkHref={giftLinkHref} onClose={() => setOpen(false)} />}
    </div>
  );
}
