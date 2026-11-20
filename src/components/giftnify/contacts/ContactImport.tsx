import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Cake, Check, FileUp, Loader2, Search, Smartphone, X } from 'lucide-react';

/**
 * Add people in bulk: from the phone's contacts (Android app, or Chrome on
 * Android), or from a contacts file (.vcf), which usually carries birthdays.
 * Nothing leaves the phone until the person ticks who to add.
 * Framework-free; keep both copies identical:
 *   resources/js/Components/contacts/ContactImport.tsx
 *   src/components/giftnify/contacts/ContactImport.tsx
 */

export interface PhoneContact { name: string; phone?: string | null; email?: string | null; birth_day?: number | null; birth_month?: number | null }
export type ImportSource = 'phone' | 'vcard' | 'google';

interface Props {
  save: (rows: PhoneContact[], source: ImportSource) => Promise<{ added: number; skipped: number } | { error: string }>;
  /** The app passes its native contacts reader; the website uses the browser's contact picker when there is one. */
  native?: (() => Promise<PhoneContact[] | null>) | null;
  /** When Google Contacts is connected: loads them for the same tick list. */
  google?: (() => Promise<PhoneContact[]>) | null;
  /** Open the Google list straight away (just came back from connecting). */
  autoGoogle?: boolean;
  onDone?: (added: number) => void;
}

export function GoogleMark({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Reads a .vcf export (Android, iPhone, Google Contacts, Outlook). */
export function parseVCard(text: string): PhoneContact[] {
  const lines = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
  const out: PhoneContact[] = [];
  let cur: (PhoneContact & { n?: string }) | null = null;
  const value = (l: string) => l.slice(l.indexOf(':') + 1).trim().replace(/\\,/g, ',').replace(/\\;/g, ';');
  for (const raw of lines) {
    const l = raw.trim();
    const key = l.split(':')[0].split(';')[0].toUpperCase().replace(/^ITEM\d+\./, '');
    if (key === 'BEGIN' && /VCARD/i.test(l)) cur = { name: '' };
    else if (key === 'END' && cur) {
      const name = (cur.name || (cur.n ? cur.n.split(';').filter(Boolean).reverse().join(' ') : '') || '').trim();
      if (name && (cur.phone || cur.email)) out.push({ name, phone: cur.phone ?? null, email: cur.email ?? null, birth_day: cur.birth_day ?? null, birth_month: cur.birth_month ?? null });
      cur = null;
    } else if (cur) {
      if (key === 'FN') cur.name = value(l);
      else if (key === 'N') cur.n = value(l);
      else if (key === 'TEL' && !cur.phone) cur.phone = value(l).replace(/^tel:/i, '');
      else if (key === 'EMAIL' && !cur.email) cur.email = value(l).toLowerCase();
      else if (key === 'BDAY') {
        const v = value(l).replace(/T.*$/, '');
        const m = v.match(/^(?:\d{4}|--)-?(\d{2})-?(\d{2})$/);
        if (m) { cur.birth_month = Number(m[1]); cur.birth_day = Number(m[2]); }
      }
    }
  }
  return out;
}

type BrowserContacts = { select: (props: string[], opts: { multiple: boolean }) => Promise<{ name?: string[]; tel?: string[]; email?: string[] }[]> };
const browserPicker = (): BrowserContacts | null => {
  if (typeof navigator === 'undefined') return null;
  const c = (navigator as unknown as { contacts?: BrowserContacts }).contacts;
  return c && typeof c.select === 'function' ? c : null;
};

export function ContactImport({ save, native, google, autoGoogle, onDone }: Props) {
  const [rows, setRows] = useState<PhoneContact[] | null>(null);
  const [source, setSource] = useState<ImportSource>('phone');
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<'reading' | 'saving' | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const picker = browserPicker();
  const canPhone = !!native || !!picker;

  const load = (list: PhoneContact[], src: ImportSource) => {
    const seen = new Set<string>();
    const clean = list.filter((c) => {
      const k = (c.phone || '').replace(/\D/g, '').slice(-10) || (c.email || '').toLowerCase();
      if (!c.name?.trim() || !k || seen.has(k)) return false;
      seen.add(k); return true;
    }).sort((a, b) => Number(!!b.birth_month) - Number(!!a.birth_month) || a.name.localeCompare(b.name));
    setRows(clean); setSource(src);
    // People with a birthday in the phone are ticked to start with.
    setPicked(new Set(clean.map((c, i) => (c.birth_month ? i : -1)).filter((i) => i >= 0)));
    setMsg(clean.length ? null : { tone: 'err', text: 'No contacts with a phone number or email were found.' });
  };

  const fromPhone = async () => {
    setMsg(null); setBusy('reading');
    try {
      if (native) {
        const list = await native();
        if (list === null) { setMsg({ tone: 'err', text: 'Allow Giftnify to read your contacts in your phone settings, then try again.' }); return; }
        load(list, 'phone');
      } else if (picker) {
        const res = await picker.select(['name', 'tel', 'email'], { multiple: true });
        load(res.map((r) => ({ name: r.name?.[0] ?? '', phone: r.tel?.[0] ?? null, email: r.email?.[0] ?? null })), 'phone');
      }
    } catch {
      setMsg({ tone: 'err', text: "We couldn't open your contacts. Try the contacts file instead." });
    } finally { setBusy(null); }
  };

  const fromGoogle = async () => {
    if (!google) return;
    setMsg(null); setBusy('reading');
    try { load(await google(), 'google'); }
    catch (e) { setMsg({ tone: 'err', text: e instanceof Error && e.message ? e.message : "Google Contacts didn't respond. Try again." }); }
    finally { setBusy(null); }
  };
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoGoogle && google && !autoRan.current) { autoRan.current = true; void fromGoogle(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGoogle, google]);

  const fromFile = async (f: File | undefined) => {
    if (!f) return;
    setMsg(null); setBusy('reading');
    try {
      if (f.size > 8 * 1024 * 1024) { setMsg({ tone: 'err', text: 'That file is too big. Export up to a few thousand contacts at a time.' }); return; }
      load(parseVCard(await f.text()), 'vcard');
    } catch { setMsg({ tone: 'err', text: "That file couldn't be read. Export your contacts as a .vcf file." }); }
    finally { setBusy(null); if (file.current) file.current.value = ''; }
  };

  const shown = useMemo(() => {
    if (!rows) return [];
    const t = q.trim().toLowerCase();
    return rows.map((r, i) => ({ r, i })).filter(({ r }) => !t || r.name.toLowerCase().includes(t) || (r.phone || '').includes(t));
  }, [rows, q]);

  const toggle = (i: number) => setPicked((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const allShown = shown.length > 0 && shown.every(({ i }) => picked.has(i));
  const toggleAll = () => setPicked((p) => { const n = new Set(p); shown.forEach(({ i }) => (allShown ? n.delete(i) : n.add(i))); return n; });

  const submit = async () => {
    if (!rows || picked.size === 0) return;
    setBusy('saving'); setMsg(null);
    const list = [...picked].map((i) => rows[i]).slice(0, 1000);
    const r = await save(list, source);
    setBusy(null);
    if ('error' in r) { setMsg({ tone: 'err', text: r.error }); return; }
    setRows(null); setPicked(new Set());
    setMsg({ tone: 'ok', text: `Added ${r.added} ${r.added === 1 ? 'person' : 'people'}${r.skipped ? ` · ${r.skipped} already saved or missing a number` : ''}.` });
    onDone?.(r.added);
  };

  const btn = 'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-5 text-sm font-extrabold transition disabled:opacity-60';

  if (rows && rows.length > 0) {
    const withBirthday = rows.filter((r) => r.birth_month).length;
    return (
      <div className="rounded-3xl border border-line bg-white p-4 shadow-soft sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg font-extrabold text-ink">Who should we remind you about?</p>
            <p className="text-sm text-ink-soft">{rows.length} contacts{withBirthday ? ` · ${withBirthday} with birthdays, already ticked` : ''}. Only the people you tick are saved.</p>
          </div>
          <button type="button" onClick={() => setRows(null)} aria-label="Cancel" className="grid size-10 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-petal"><X className="size-5" aria-hidden /></button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search contacts"
              className="h-11 w-full rounded-full border border-line bg-white pl-10 pr-4 text-sm outline-none focus:border-[#E5007D]" />
          </label>
          <button type="button" onClick={toggleAll} className="h-11 shrink-0 rounded-full bg-petal px-4 text-sm font-bold text-ink">{allShown ? 'Untick all' : 'Tick all'}</button>
        </div>
        <ul className="mt-3 max-h-[52vh] divide-y divide-line overflow-y-auto rounded-2xl border border-line">
          {shown.map(({ r, i }) => (
            <li key={i}>
              <label className="flex cursor-pointer items-center gap-3 px-3.5 py-3 hover:bg-petal/60">
                <input type="checkbox" checked={picked.has(i)} onChange={() => toggle(i)} className="size-5 shrink-0 accent-[#E5007D]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink">{r.name}</span>
                  <span className="block truncate text-xs text-ink-soft">{r.phone || r.email}</span>
                </span>
                {r.birth_month && r.birth_day ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFF8E6] px-2.5 py-1 text-xs font-bold text-[#7A4B00]">
                    <Cake className="size-3.5" aria-hidden /> {r.birth_day} {MONTHS[r.birth_month - 1]}
                  </span>
                ) : null}
              </label>
            </li>
          ))}
        </ul>
        {msg && <p role="alert" className={`mt-3 text-sm font-bold ${msg.tone === 'ok' ? 'text-[#0B7A55]' : 'text-[#A12B2B]'}`}>{msg.text}</p>}
        <button type="button" onClick={submit} disabled={busy === 'saving' || picked.size === 0}
          className={`${btn} mt-4 w-full bg-gradient-primary text-white shadow-glow`}>
          {busy === 'saving' ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Check className="size-5" aria-hidden />}
          Add {picked.size} {picked.size === 1 ? 'person' : 'people'}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-line bg-white p-4 shadow-soft sm:p-5">
      <p className="font-display text-lg font-extrabold text-ink">Add people from your contacts</p>
      <p className="mt-1 text-sm text-ink-soft">We'll remind you before their birthdays. Friends already on Giftnify bring their birthday with them.</p>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {google && (
          <button type="button" onClick={fromGoogle} disabled={!!busy} className={`${btn} border border-line bg-white text-ink hover:bg-petal sm:col-span-2`}>
            {busy === 'reading' ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <GoogleMark />} Import from Google Contacts
          </button>
        )}
        {canPhone && (
          <button type="button" onClick={fromPhone} disabled={!!busy} className={`${btn} bg-gradient-primary text-white shadow-glow`}>
            {busy === 'reading' ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Smartphone className="size-5" aria-hidden />} Add from my phone
          </button>
        )}
        <button type="button" onClick={() => file.current?.click()} disabled={!!busy} className={`${btn} border border-line bg-white text-ink hover:bg-petal`}>
          <FileUp className="size-5" aria-hidden /> Upload contacts file (.vcf)
        </button>
        <input ref={file} type="file" accept=".vcf,text/vcard,text/x-vcard" className="sr-only" onChange={(e) => fromFile(e.target.files?.[0])} />
      </div>
      <details className="mt-3 text-xs text-ink-soft">
        <summary className="cursor-pointer font-bold">How do I get a contacts file?</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Android: Contacts app → Fix &amp; manage (or Settings) → Export to file.</li>
          <li>iPhone: Contacts → Lists → long-press "All Contacts" → Export.</li>
          <li>Google Contacts (contacts.google.com): Export → vCard.</li>
        </ul>
      </details>
      {msg && <p role="status" className={`mt-3 text-sm font-bold ${msg.tone === 'ok' ? 'text-[#0B7A55]' : 'text-[#A12B2B]'}`}>{msg.text}</p>}
    </div>
  );
}
