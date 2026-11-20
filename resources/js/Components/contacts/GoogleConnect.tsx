import React, { useState } from 'react';
import { CalendarCheck, CheckCircle2, Loader2, RefreshCw, Users } from 'lucide-react';
import { GoogleMark } from './ContactImport';

/**
 * "Connect Google" card: Google Contacts (bring people in with birthdays) and
 * Google Calendar (a Giftnify Birthdays calendar with reminders).
 * Framework-free; keep both copies identical:
 *   resources/js/Components/contacts/GoogleConnect.tsx
 *   src/components/giftnify/contacts/GoogleConnect.tsx
 */

export interface GoogleStatus {
  available: boolean; connected: boolean; email?: string | null; contacts?: boolean; calendar?: boolean;
  calendar_events?: number; calendar_synced_at?: string | null; contacts_imported_at?: string | null; error?: string | null;
}
type Want = 'both' | 'contacts' | 'calendar';

interface Props {
  status: GoogleStatus;
  onConnect: (want: Want) => void;
  onCalendar: (enabled: boolean) => Promise<void>;
  onSync: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

const ago = (iso?: string | null) => {
  if (!iso) return '';
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

export function GoogleConnect({ status, onConnect, onCalendar, onSync, onDisconnect }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!status.available) return null;
  const run = async (k: string, fn: () => Promise<void>) => { setBusy(k); try { await fn(); } finally { setBusy(null); } };

  if (!status.connected) {
    return (
      <div className="rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#F1F5FF]"><GoogleMark className="size-6" /></span>
          <div>
            <p className="font-display text-lg font-extrabold text-ink">Connect Google</p>
            <p className="text-sm text-ink-soft">Never miss a birthday, wherever you look.</p>
          </div>
        </div>
        <ul className="mt-4 grid gap-3 text-sm">
          <li className="flex gap-3"><Users className="mt-0.5 size-5 shrink-0 text-[#E5007D]" aria-hidden /><span><b className="text-ink">Google Contacts:</b> <span className="text-ink-soft">bring in the people you love, with the birthdays you've saved.</span></span></li>
          <li className="flex gap-3"><CalendarCheck className="mt-0.5 size-5 shrink-0 text-[#E5007D]" aria-hidden /><span><b className="text-ink">Google Calendar:</b> <span className="text-ink-soft">a "Giftnify Birthdays" calendar with a reminder a week before and the day before. We can't see your other calendars.</span></span></li>
        </ul>
        <button type="button" onClick={() => onConnect('both')}
          className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-extrabold text-ink shadow-soft transition hover:bg-[#F8F9FF]">
          <GoogleMark /> Continue with Google
        </button>
        <p className="mt-2 text-center text-xs text-ink-soft">
          Just one? <button type="button" onClick={() => onConnect('contacts')} className="font-bold underline">Contacts only</button> · <button type="button" onClick={() => onConnect('calendar')} className="font-bold underline">Calendar only</button>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#F1F5FF]"><GoogleMark className="size-6" /></span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-display text-lg font-extrabold text-ink">Google connected <CheckCircle2 className="size-5 text-[#0B7A55]" aria-hidden /></p>
          <p className="truncate text-sm text-ink-soft">{status.email}</p>
        </div>
      </div>
      {status.error && <p role="alert" className="mt-3 rounded-2xl bg-[#FFF1F1] px-4 py-3 text-sm font-semibold text-[#A12B2B]">{status.error}</p>}

      <div className="mt-4 grid gap-3">
        <div className="flex items-center gap-3 rounded-2xl bg-petal/60 px-4 py-3">
          <Users className="size-5 shrink-0 text-[#E5007D]" aria-hidden />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-bold text-ink">Google Contacts</p>
            <p className="text-ink-soft">{status.contacts ? (status.contacts_imported_at ? `Last imported ${ago(status.contacts_imported_at)}. Import again below.` : 'Ready. Use "Import from Google Contacts" below.') : 'Not allowed yet.'}</p>
          </div>
          {!status.contacts && <button type="button" onClick={() => onConnect('contacts')} className="h-9 shrink-0 rounded-full bg-ink px-3.5 text-xs font-extrabold text-white">Allow</button>}
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-petal/60 px-4 py-3">
          <CalendarCheck className="size-5 shrink-0 text-[#E5007D]" aria-hidden />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-bold text-ink">Google Calendar</p>
            <p className="text-ink-soft">{status.calendar
              ? `${status.calendar_events ?? 0} ${(status.calendar_events ?? 0) === 1 ? 'date' : 'dates'} on "Giftnify Birthdays"${status.calendar_synced_at ? ` · updated ${ago(status.calendar_synced_at)}` : ''}`
              : 'Add birthdays to your calendar with reminders.'}</p>
          </div>
          {status.calendar ? (
            <button type="button" aria-label="Update calendar now" onClick={() => run('sync', onSync)} disabled={!!busy} className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-white">
              {busy === 'sync' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
            </button>
          ) : null}
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input type="checkbox" className="peer sr-only" checked={!!status.calendar} disabled={!!busy}
              onChange={(e) => run('cal', () => onCalendar(e.target.checked))} aria-label="Google Calendar birthdays" />
            <span className="h-7 w-12 rounded-full bg-[#E5D9E1] transition peer-checked:bg-[#E5007D] peer-disabled:opacity-60" />
            <span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </label>
        </div>
      </div>

      <button type="button" onClick={() => run('off', onDisconnect)} disabled={!!busy}
        className="mt-4 text-xs font-bold text-ink-soft hover:text-[#A12B2B]">
        {busy === 'off' ? 'Disconnecting…' : 'Disconnect Google (removes the Giftnify Birthdays calendar)'}
      </button>
    </div>
  );
}
