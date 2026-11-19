import React, { useEffect, useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import QRCode from 'qrcode';
import { AppLayout } from '../../Layouts/AppLayout';
import { Copy, Check, Gift, Eye, EyeOff, Loader2, Camera, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const SYMBOL: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', CAD: 'C$', GHS: 'GH₵', KES: 'KSh', ZAR: 'R' };

export default function CreatorEdit({ profile, currencies, received }: any) {
  const { errors } = usePage().props as any;
  const [username, setUsername] = useState(profile.username || '');
  const [name, setName] = useState(profile.name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [currency, setCurrency] = useState(profile.currency || 'NGN');
  const [amounts, setAmounts] = useState<string[]>((profile.amounts || [1000, 2000, 5000]).map(String));
  const [wall, setWall] = useState(profile.wall ?? true);
  const [enabled, setEnabled] = useState(profile.username ? !!profile.creator_enabled : true);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(profile.avatar_url);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const link: string | null = profile.link;

  useEffect(() => {
    if (link && qrRef.current) {
      QRCode.toCanvas(qrRef.current, link, { width: 180, margin: 1, color: { dark: '#22101D', light: '#FFFFFF' } }).catch(() => {});
    }
  }, [link]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    router.post('/creator', {
      username, name, bio, currency, amounts: amounts.map(Number), wall, creator_enabled: enabled,
      ...(avatar ? { avatar } : {}),
    }, {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => toast.success('Your gift link is saved.'),
      onError: (e) => toast.error((Object.values(e)[0] as string) || 'Check the form and try again.'),
      onFinish: () => setSaving(false),
    });
  };

  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { toast.error('Copy failed. Select the link and copy it.'); }
  };

  const msg = encodeURIComponent(`Send me a mystery gift on Giftnify 🎁 ${link ?? ''}`);
  const SHARE = link ? [
    { name: 'WhatsApp', href: `https://wa.me/?text=${msg}`, bg: 'bg-[#25D366]' },
    { name: 'X', href: `https://twitter.com/intent/tweet?text=${msg}`, bg: 'bg-[#111111]' },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, bg: 'bg-[#1877F2]' },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`, bg: 'bg-[#0A66C2]' },
  ] : [];

  const field = 'w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10';

  return (
    <AppLayout>
      <Head title="My gift link — Giftnify" />
      <div className="mx-auto grid max-w-5xl gap-6 pb-16 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-ink">My gift link</h1>
            <p className="mt-1 text-ink-soft">One link for your bio. Fans send you mystery gifts; you open each one and the cash lands in your wallet.</p>
          </div>

          <form onSubmit={save} className="space-y-5 rounded-3xl border border-line bg-white p-6 shadow-soft">
            <div className="flex items-center gap-4">
              <label className="relative cursor-pointer">
                {preview
                  ? <img src={preview} alt="" className="size-20 rounded-full object-cover ring-4 ring-petal" />
                  : <span className="grid size-20 place-items-center rounded-full bg-gradient-primary font-display text-3xl font-extrabold text-white">{(name || '?').slice(0, 1)}</span>}
                <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-ink text-white ring-2 ring-white"><Camera className="size-4" aria-hidden /></span>
                <input type="file" accept="image/*" className="sr-only" aria-label="Profile photo"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setAvatar(f); setPreview(URL.createObjectURL(f)); } }} />
              </label>
              <div className="min-w-0 flex-1">
                <label htmlFor="c-name" className="block text-xs font-bold text-ink-soft">Display name</label>
                <input id="c-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className={`${field} mt-1`} />
              </div>
            </div>

            <div>
              <label htmlFor="c-username" className="block text-xs font-bold text-ink-soft">Your link</label>
              <div className="mt-1 flex items-center rounded-2xl border border-line bg-white focus-within:border-[#E5007D] focus-within:ring-4 focus-within:ring-[#E5007D]/10">
                <span className="pl-4 text-sm font-semibold text-ink-soft">giftnify.app/@</span>
                <input id="c-username" value={username} maxLength={30} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="yourname" className="min-w-0 flex-1 bg-transparent py-3 pr-4 text-sm font-bold text-ink outline-none" />
              </div>
              {errors?.username && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.username}</p>}
            </div>

            <div>
              <label htmlFor="c-bio" className="block text-xs font-bold text-ink-soft">Bio</label>
              <input id="c-bio" value={bio} maxLength={160} onChange={(e) => setBio(e.target.value)} placeholder="Product designer · Gift lover · Coffee & creativity" className={`${field} mt-1`} />
            </div>

            <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
              <div>
                <label htmlFor="c-cur" className="block text-xs font-bold text-ink-soft">Currency</label>
                <select id="c-cur" value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${field} mt-1`}>
                  {(currencies?.length ? currencies : ['NGN']).map((c: string) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <fieldset>
                <legend className="block text-xs font-bold text-ink-soft">Gift buttons fans see</legend>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {amounts.map((a, i) => (
                    <label key={i} className="flex items-center rounded-2xl border border-line bg-white px-3 focus-within:border-[#E5007D]">
                      <span className="text-sm font-bold text-ink-soft">{SYMBOL[currency] ?? currency}</span>
                      <input inputMode="decimal" aria-label={`Amount ${i + 1}`} value={a}
                        onChange={(e) => setAmounts((arr) => arr.map((x, j) => (j === i ? e.target.value.replace(/[^\d.]/g, '') : x)))}
                        className="min-w-0 flex-1 bg-transparent py-3 pl-1 text-sm font-bold text-ink outline-none" />
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-start gap-2.5 rounded-2xl border border-line p-3.5">
                <input type="checkbox" checked={wall} onChange={(e) => setWall(e.target.checked)} className="mt-0.5 size-4 accent-[#E5007D]" />
                <span><span className="block text-sm font-bold text-ink">Show recent gifts on my page</span><span className="block text-xs text-ink-soft">Fans' public notes. Amounts are never shown.</span></span>
              </label>
              <label className="flex items-start gap-2.5 rounded-2xl border border-line p-3.5">
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-0.5 size-4 accent-[#E5007D]" />
                <span><span className="block text-sm font-bold text-ink">Link is live</span><span className="block text-xs text-ink-soft">Turn off to pause new gifts.</span></span>
              </label>
            </div>

            <button type="submit" disabled={saving || username.length < 3 || name.trim().length < 2}
              className="inline-flex h-13 min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary font-extrabold text-white shadow-glow disabled:opacity-50">
              {saving && <Loader2 className="size-5 animate-spin" aria-hidden />} {profile.username ? 'Save changes' : 'Create my gift link'}
            </button>
          </form>

          {/* Received */}
          <section className="rounded-3xl border border-line bg-white p-6">
            <h2 className="font-display text-xl font-extrabold text-ink">Gifts to your link</h2>
            {received.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">Nothing yet. Share your link to get your first mystery gift.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {received.map((g: any) => (
                  <li key={g.token} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-petal"><Gift className="size-5 text-[#E5007D]" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink">{g.opened ? `${g.from} · ${SYMBOL[g.currency] ?? g.currency}${Number(g.amount).toLocaleString()}` : 'A sealed mystery gift'}</p>
                      <p className="text-xs text-ink-soft">{g.occasion}{g.note ? ` · "${g.note}"` : ''}</p>
                    </div>
                    {g.opened ? (
                      g.on_wall && (
                        <button type="button" onClick={() => router.post(`/creator/gifts/${g.token}/wall`, {}, { preserveScroll: true })}
                          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-petal">
                          {g.wall_hidden ? <><Eye className="size-3.5" aria-hidden /> Show note</> : <><EyeOff className="size-3.5" aria-hidden /> Hide note</>}
                        </button>
                      )
                    ) : (
                      <a href={g.link} className="rounded-full bg-gradient-primary px-4 py-2 text-xs font-extrabold text-white shadow-glow">Open it</a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Share */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {link ? (
            <div className="rounded-3xl border border-line bg-white p-6 text-center shadow-soft">
              <p className="flex items-center justify-center gap-2 text-sm font-bold text-[#0E9F6E]"><Check className="size-4" aria-hidden /> Your gift link is ready</p>
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-petal p-1.5 pl-4">
                <span className="min-w-0 flex-1 truncate text-left text-sm font-bold text-ink">{link.replace(/^https?:\/\//, '')}</span>
                <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-ink">
                  {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />} {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {SHARE.map((s) => (
                  <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" className={`rounded-xl ${s.bg} py-2.5 text-xs font-bold text-white`}>{s.name}</a>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-soft">Instagram and TikTok: paste the link in your bio.</p>
              <canvas ref={qrRef} className="mx-auto mt-5 rounded-xl" aria-label="QR code for your gift link" role="img" />
              <p className="mt-2 text-xs text-ink-soft">Scan to open your page. Screenshot it for flyers and stories.</p>
              <Link href={`/@${profile.username}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#B4005E]">
                View my page <ExternalLink className="size-4" aria-hidden />
              </Link>
            </div>
          ) : (
            <div className="rounded-3xl bg-gradient-plum p-6 text-white">
              <h2 className="font-display text-xl font-extrabold">How it works</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-white/85">
                <li>Pick your link name and save.</li>
                <li>Share it in your bio, status and stories.</li>
                <li>Fans send mystery gifts with a message, even anonymously.</li>
                <li>You open each one. The cash goes to your Giftnify wallet.</li>
              </ol>
            </div>
          )}
        </aside>
      </div>
    </AppLayout>
  );
}
