import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { AdminLayout } from '../../Layouts/AdminLayout';
import { CalendarDays, CheckCircle2, Copy } from 'lucide-react';
import { toast } from 'sonner';

type Field = { label: string; set: boolean; source: 'console' | 'env' | null; ending: string | null };
interface Settings { fields: Record<string, Field>; redirect_uri: string; origin: string; connected_users: number }

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-white/50">{label}</p>
      <div className="mt-1 flex items-center gap-2 rounded-xl bg-black/30 px-3 py-2">
        <code className="min-w-0 flex-1 break-all text-sm text-white/90">{value}</code>
        <button type="button" onClick={() => { void navigator.clipboard.writeText(value); toast.success('Copied'); }}
          aria-label={`Copy ${label}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white">
          <Copy className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export default function GoogleSettings({ settings }: { settings: Settings }) {
  const { errors } = usePage().props as { errors: Record<string, string> };
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const ready = Object.values(settings.fields).every((f) => f.set);

  const save = (clear: string[] = []) => {
    setSaving(true);
    router.post('/admin/settings/google', { keys: values, clear }, {
      preserveScroll: true,
      onSuccess: () => { setValues({}); toast.success('Google settings saved.'); },
      onFinish: () => setSaving(false),
    });
  };

  return (
    <AdminLayout>
      <Head title="Google — Staff" />
      <div className="mx-auto max-w-3xl space-y-6 pb-16">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-extrabold text-white"><CalendarDays className="size-6 text-pink-400" aria-hidden /> Google Contacts &amp; Calendar</h1>
          <p className="mt-2 text-sm text-white/60">Lets people bring in their Google Contacts (with birthdays) and get a "Giftnify Birthdays" calendar with reminders. The secret is stored encrypted.</p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className={`flex items-center gap-2 font-bold ${ready ? 'text-emerald-300' : 'text-amber-300'}`}>
            {ready ? <><CheckCircle2 className="size-5" aria-hidden /> Ready. {settings.connected_users} {settings.connected_users === 1 ? 'person has' : 'people have'} connected Google.</> : 'Not set up yet: people won\'t see "Connect Google".'}
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-bold text-white">1. Create the keys in Google Cloud</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-white/75">
            <li>Go to <a className="font-semibold text-pink-300 underline" href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">console.cloud.google.com</a> and create a project called Giftnify.</li>
            <li>APIs &amp; Services → Library: turn on <b>People API</b> and <b>Google Calendar API</b>.</li>
            <li>OAuth consent screen (Google Auth Platform → Branding): app name Giftnify, your logo, support email, privacy policy link. Under Data access, add the scopes <code>contacts.readonly</code> and <code>calendar.app.created</code>.</li>
            <li>Clients → Create client → <b>Web application</b>. Add the two values below, then copy the client ID and secret here.</li>
            <li>While Google reviews the app, add testers under Audience (up to 100 people can use it before approval).</li>
          </ol>
          <div className="mt-4 grid gap-3">
            <CopyRow label="Authorised JavaScript origin" value={settings.origin} />
            <CopyRow label="Authorised redirect URI" value={settings.redirect_uri} />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-bold text-white">2. Paste them here</h2>
          <div className="mt-4 grid gap-4">
            {Object.entries(settings.fields).map(([k, f]) => (
              <div key={k}>
                <label htmlFor={k} className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white/85">
                  {f.label}
                  {f.set && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-300">Saved{f.source === 'env' ? ' in .env' : ''}{k === 'client_secret' && f.ending ? ` · ends ${f.ending}` : ''}</span>}
                </label>
                {k === 'client_id' && f.set && f.ending && <p className="mt-1 break-all text-xs text-white/40">{f.ending}</p>}
                <input id={k} type={k === 'client_secret' ? 'password' : 'text'} autoComplete="off" spellCheck={false}
                  placeholder={k === 'client_id' ? '1234-abc.apps.googleusercontent.com' : 'GOCSPX-…'} value={values[k] ?? ''}
                  onChange={(e) => setValues({ ...values, [k]: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-pink-400" />
                {errors?.[`keys.${k}`] && <p className="mt-1 text-xs font-semibold text-red-300">{errors[`keys.${k}`]}</p>}
                {f.source === 'console' && (
                  <button type="button" onClick={() => save([k])} className="mt-1 text-xs font-semibold text-white/50 hover:text-white">Remove saved value</button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => save()} disabled={saving || !Object.values(values).some(Boolean)}
            className="mt-5 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#07040d] hover:bg-white/90 disabled:opacity-50">Save</button>
        </section>
      </div>
    </AdminLayout>
  );
}
