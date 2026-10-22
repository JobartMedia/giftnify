import React, { useEffect, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { AppLayout } from '../Layouts/AppLayout';
import { Icon3D } from '../Components/Icon3D';
import { MysteryCard } from '../Components/MysteryCard';
import { ArrowRight, ArrowUpRight, Play, Video, Send, KeyRound } from 'lucide-react';

const STEPS = [
  {
    title: 'Record your message',
    body: 'Film a short video, record a voice note or write a letter. Giftgenie A.i can help you find the words.',
  },
  {
    title: 'Add cash or a gift',
    body: 'Choose an amount in your currency, or pick perfume, flowers, a spa day and more from the catalogue.',
  },
  {
    title: 'We deliver the mystery',
    body: 'They get a sealed link by WhatsApp, SMS, email or a link you share. Your name and the gift appear only after your message plays.',
  },
];

export default function Home({ sample_token }: { stats?: any; sample_token: string }) {
  const { cms } = usePage().props as any;
  const occasions: any[] = cms?.occasions || [];
  const sampleHref = sample_token ? `/gift/${sample_token}` : '/demo';

  const [greeting, setGreeting] = useState('Hello');
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  }, []);

  return (
    <AppLayout>
      <Head title="More than a gift. It's a feeling." />

      {/* ---------------- Hero ---------------- */}
      <section className="relative grid items-center gap-10 pb-10 pt-2 md:pb-16 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-14 lg:pt-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 -z-10 size-[520px] rounded-full bg-[radial-gradient(closest-side,#FFE3F1,transparent)] lg:right-0"
        />

        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink-soft">{greeting}. Who are we surprising today?</p>

          <h1 className="mt-3 font-display text-[2.6rem] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink min-[400px]:text-[2.9rem] sm:text-6xl lg:text-[4.6rem]">
            More than a gift.
            <br />
            It's a feeling.
          </h1>

          <p className="mt-5 max-w-[34rem] text-base leading-relaxed text-ink-soft sm:text-lg">
            Send a mystery gift with a private video, voice note or letter. The sender and the gift stay hidden until your message plays.
          </p>

          <div className="mt-7 grid gap-3 sm:flex sm:items-center">
            <Link
              href="/create"
              className="group inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-gradient-primary px-7 text-base font-extrabold text-white shadow-glow transition active:scale-[0.98]"
            >
              Send a mystery gift
              <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link
              href={sampleHref}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-line bg-white px-6 text-base font-bold text-ink transition hover:border-ink/25 active:scale-[0.98]"
            >
              <Play className="size-4 fill-magenta text-magenta" aria-hidden />
              Open a sample gift
            </Link>
          </div>

          <ul className="mt-9 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-line pt-6 text-sm sm:grid-cols-3">
            {[
              { icon: Video, text: 'Video, voice or letter' },
              { icon: Send, text: 'WhatsApp, SMS, email or link' },
              { icon: KeyRound, text: 'Redeemed once, by them' },
            ].map(({ icon: I, text }) => (
              <li key={text} className="flex items-center gap-2.5 font-semibold text-ink">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-petal text-magenta-deep">
                  <I className="size-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <MysteryCard sampleHref={sampleHref} />
      </section>

      {/* ---------------- Start with ---------------- */}
      <section aria-labelledby="start-title" className="py-8 md:py-12">
        <h2 id="start-title" className="font-display text-2xl font-extrabold text-ink md:text-3xl">
          Start with
        </h2>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:gap-4">
          {/* Lead tile */}
          <Link
            href="/create?type=money"
            className="group relative flex items-center gap-4 overflow-hidden rounded-[1.75rem] border border-line bg-gradient-blush p-4 transition hover:border-magenta/30 md:min-h-[300px] md:flex-col md:items-start md:justify-between md:p-8"
          >
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white shadow-soft md:order-2 md:size-auto md:self-end md:bg-transparent md:shadow-none">
              <Icon3D name="money" size="xl" className="!size-12 md:!size-40" />
            </span>
            <span className="min-w-0 flex-1 md:order-1 md:flex-none">
              <span className="block font-display text-lg font-extrabold text-ink md:text-3xl">Send money</span>
              <span className="mt-0.5 block text-sm text-ink-soft md:mt-2 md:max-w-xs md:text-base">
                A cash surprise they unlock after your message. They choose how to receive it.
              </span>
            </span>
            <ArrowUpRight className="size-5 shrink-0 text-ink-soft transition group-hover:text-magenta md:absolute md:left-8 md:bottom-8 md:size-6" aria-hidden />
          </Link>

          <div className="grid gap-3 md:gap-4">
            {[
              { href: '/create?type=item', icon: 'gift', title: 'Send a gift', body: 'Perfume, flowers, spa days and more.' },
              { href: '/giftsense', icon: 'sparkle', title: 'Ask Giftgenie A.i', body: 'Tell us about them, get ideas that fit.' },
            ].map((t) => (
              <Link
                key={t.title}
                href={t.href}
                className="group flex items-center gap-4 rounded-[1.75rem] border border-line bg-white p-4 transition hover:border-magenta/30 md:p-6"
              >
                <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-petal md:size-20">
                  <Icon3D name={t.icon} size="lg" className="!size-12 md:!size-14" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-extrabold text-ink md:text-xl">{t.title}</span>
                  <span className="mt-0.5 block text-sm text-ink-soft">{t.body}</span>
                </span>
                <ArrowUpRight className="size-5 shrink-0 text-ink-soft transition group-hover:text-magenta" aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Occasions ---------------- */}
      {occasions.length > 0 && (
        <section aria-labelledby="occ-title" className="py-8 md:py-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="occ-title" className="font-display text-2xl font-extrabold text-ink md:text-3xl">
                Pick the occasion
              </h2>
              <p className="mt-1 text-sm text-ink-soft">Each one comes with its own artwork and message prompts.</p>
            </div>
            <Link href="/create" className="hidden shrink-0 items-center gap-1 text-sm font-bold text-magenta-deep hover:underline sm:inline-flex">
              All occasions <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="no-scrollbar -mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-8">
            {occasions.map((occ: any) => (
              <Link
                key={occ.id}
                href={`/create?occasion=${encodeURIComponent(occ.id)}`}
                className="group flex w-[88px] shrink-0 snap-start flex-col items-center gap-2 sm:w-auto"
              >
                <span className="grid aspect-square w-full place-items-center rounded-[1.4rem] bg-petal transition duration-300 group-hover:-translate-y-1 group-hover:bg-petal-deep">
                  <Icon3D name={occ.icon || 'gift'} size="md" className="!size-11 sm:!size-14" />
                </span>
                <span className="w-full truncate text-center text-[13px] font-semibold text-ink">{occ.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- How it works (a real sequence) ---------------- */}
      <section aria-labelledby="how-title" className="py-10 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <h2 id="how-title" className="font-display text-3xl font-extrabold leading-tight text-ink md:text-4xl">
              Two minutes for you.
              <br className="hidden sm:block" /> A moment they keep.
            </h2>
            <p className="mt-3 max-w-md text-ink-soft">
              Three steps from idea to sealed gift. You can save a draft and come back to it.
            </p>
          </div>

          <ol className="relative space-y-7 border-l-2 border-dashed border-line pl-8 md:space-y-9">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="absolute -left-[3.05rem] top-0 grid size-9 place-items-center rounded-full bg-white font-display text-sm font-extrabold text-magenta-deep ring-2 ring-line">
                  {i + 1}
                </span>
                <h3 className="font-display text-xl font-extrabold text-ink">{s.title}</h3>
                <p className="mt-1.5 max-w-[60ch] leading-relaxed text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- Closing band ---------------- */}
      <section className="relative my-6 overflow-hidden rounded-[2rem] bg-gradient-plum px-6 py-10 text-white sm:px-10 md:my-10 md:py-14">
        <div className="relative grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:pr-48 lg:pr-56">
          <div>
            <h2 className="font-display text-3xl font-extrabold leading-tight md:text-4xl">Someone's day is about to change.</h2>
            <p className="mt-2 max-w-lg text-white/70">Record the message, seal the gift, and let them find out who it's from.</p>
          </div>
          <div className="grid gap-3 sm:flex">
            <Link
              href="/create"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-7 font-extrabold text-plum transition hover:bg-petal active:scale-[0.98]"
            >
              Send a mystery gift
              <ArrowRight className="size-5" aria-hidden />
            </Link>
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute -bottom-8 right-6 hidden md:block lg:right-10">
          <Icon3D name="gift-open" size="xl" className="!size-36 rotate-12 md:!size-44" />
        </div>
      </section>
    </AppLayout>
  );
}
