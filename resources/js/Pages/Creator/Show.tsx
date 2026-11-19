import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { AppLayout } from '../../Layouts/AppLayout';
import { Icon3D } from '../../Components/Icon3D';
import { Gift, HelpCircle, Share2, Clock, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const SYMBOL: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', CAD: 'C$', GHS: 'GH₵', KES: 'KSh', ZAR: 'R' };
const OCCASIONS = ['Just Because', 'Birthday', 'New Job', 'Congratulations', 'Thank You', 'Wedding'];

function ago(iso?: string | null) {
  if (!iso) return '';
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function CreatorShow({ creator }: any) {
  const [occasion, setOccasion] = useState('Just Because');
  const [copied, setCopied] = useState(false);

  if (!creator) {
    return (
      <AppLayout>
        <Head title="Gift link not found — Giftnify" />
        <div className="mx-auto max-w-md py-16 text-center">
          <Icon3D name="gift" size="lg" />
          <h1 className="mt-6 font-display text-3xl font-extrabold text-ink">This gift link isn't active</h1>
          <p className="mt-2 text-ink-soft">Check the spelling, or ask them for their latest link.</p>
          <Link href="/creator" className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-gradient-primary px-6 font-extrabold text-white shadow-glow">
            Create your own gift link
          </Link>
        </div>
      </AppLayout>
    );
  }

  const first = String(creator.name).split(' ')[0];
  const sym = SYMBOL[creator.currency] ?? `${creator.currency} `;
  const send = (amount: number, mode: 'classic' | 'guess' | 'anonymous') =>
    `/create?creator=${encodeURIComponent(creator.username)}&amount=${amount}&mode=${mode}&occasion=${encodeURIComponent(occasion)}`;

  const share = async () => {
    const text = `Send me a mystery gift on Giftnify 🎁 ${creator.link}`;
    try {
      if (navigator.share) { await navigator.share({ title: `Giftnify ${creator.name}`, text, url: creator.link }); return; }
      await navigator.clipboard.writeText(creator.link);
      setCopied(true); toast.success('Link copied');
      setTimeout(() => setCopied(false), 1800);
    } catch { /* share sheet closed */ }
  };

  return (
    <AppLayout>
      <Head title={`Giftnify ${creator.name}`}>
        <meta name="description" content={`Send ${creator.name} a mystery gift on Giftnify.`} />
        <meta property="og:title" content={`Giftnify ${creator.name} 🎁`} />
        <meta property="og:description" content={creator.bio || `Send ${first} a mystery gift.`} />
      </Head>

      <div className="mx-auto max-w-lg pb-16">
        {/* Profile */}
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-plum px-6 pb-8 pt-10 text-center text-white">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-[#E5007D]/30 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 size-48 rounded-full bg-[#FFD27A]/15 blur-3xl" />
          <button type="button" onClick={share} aria-label="Share this gift link"
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 ring-1 ring-inset ring-white/15 transition hover:bg-white/20">
            {copied ? <Check className="size-5" aria-hidden /> : <Share2 className="size-5" aria-hidden />}
          </button>

          {creator.avatar_url
            ? <img src={creator.avatar_url} alt="" className="relative mx-auto size-28 rounded-full object-cover ring-4 ring-white/25" />
            : <span className="relative mx-auto grid size-28 place-items-center rounded-full bg-gradient-primary font-display text-5xl font-extrabold ring-4 ring-white/25">{first.slice(0, 1)}</span>}
          <h1 className="relative mt-5 font-display text-4xl font-extrabold tracking-tight">{creator.name}</h1>
          <p className="relative mt-1 text-sm font-semibold text-white/60">giftnify.app/@{creator.username}</p>
          {creator.bio && <p className="relative mx-auto mt-3 max-w-xs text-white/85">{creator.bio}</p>}
          {creator.gifts_count > 0 && (
            <p className="relative mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#FFD27A]/15 px-3.5 py-1.5 text-sm font-bold text-[#FFD27A]">
              <Gift className="size-4" aria-hidden /> {creator.gifts_count} {creator.gifts_count === 1 ? 'person has' : 'people have'} sent mystery gifts
            </p>
          )}
        </section>

        {/* Send */}
        <section className="-mt-5 relative rounded-[2rem] border border-line bg-white p-6 shadow-soft" aria-labelledby="send-title">
          <h2 id="send-title" className="font-display text-xl font-extrabold text-ink">Send {first} a mystery gift</h2>
          <p className="mt-1 text-sm text-ink-soft">Add a message. {first} plays it, finds out what's inside, and the cash lands in their wallet.</p>

          <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Occasion">
            {OCCASIONS.map((o) => (
              <button key={o} type="button" role="radio" aria-checked={occasion === o} onClick={() => setOccasion(o)}
                className={`rounded-full px-3.5 py-2 text-sm font-bold transition ${occasion === o ? 'bg-ink text-white' : 'bg-petal text-ink hover:bg-[#FCE2EF]'}`}>
                {o}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-2.5">
            {(creator.amounts as number[]).map((a, i) => (
              <Link key={a} href={send(a, 'classic')}
                className={`flex h-14 items-center justify-center gap-2 rounded-2xl font-extrabold transition active:scale-[0.99] ${i === 1 ? 'bg-gradient-primary text-white shadow-glow' : 'border border-line bg-white text-ink hover:border-[#E5007D]/40'}`}>
                <Gift className="size-5" aria-hidden /> Send {sym}{Number(a).toLocaleString()} Mystery Box
              </Link>
            ))}
            <Link href={send(creator.amounts?.[1] ?? creator.amounts?.[0] ?? 1000, 'guess')}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#E5007D]/40 font-extrabold text-[#B4005E] transition hover:bg-petal">
              <HelpCircle className="size-5" aria-hidden /> Send a Guess Gift
            </Link>
            <Link href={send(creator.amounts?.[0] ?? 1000, 'anonymous')} className="text-center text-sm font-bold text-ink-soft hover:text-ink">
              Or send anonymously, any amount
            </Link>
          </div>
        </section>

        {/* Wall */}
        {creator.wall?.length > 0 && (
          <section className="mt-8" aria-labelledby="wall-title">
            <h2 id="wall-title" className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
              <Clock className="size-5 text-ink-soft" aria-hidden /> Recent gifts
            </h2>
            <ul className="mt-3 grid gap-2.5">
              {creator.wall.map((w: any) => (
                <li key={w.id} className="flex gap-3 rounded-2xl border border-line bg-white p-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-petal">
                    {w.kind === 'Guess Gift' ? <HelpCircle className="size-5 text-[#E5007D]" aria-hidden /> : <Gift className="size-5 text-[#E5007D]" aria-hidden />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">Sent a {w.kind} <span className="font-semibold text-ink-soft">· {ago(w.at)}</span></p>
                    {w.note && <p className="mt-0.5 break-words text-sm text-ink">"{w.note}"</p>}
                    <p className="mt-1 text-xs font-semibold text-ink-soft">{w.from} · {w.occasion}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-10 text-center text-sm text-ink-soft">
          Want your own? <Link href="/creator" className="font-bold text-[#B4005E]">Create your gift link</Link>
        </p>
      </div>
    </AppLayout>
  );
}
