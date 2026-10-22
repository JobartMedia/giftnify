import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Lock, Mic, Play, RotateCcw } from 'lucide-react';

/**
 * The homepage "sealed gift". Tapping it peels the ribbon and shows what a
 * recipient sees — the one bold, interactive moment on the page.
 * Keep in sync with src/components/giftnify/MysteryCard.tsx (app version).
 */
export function MysteryCard({ sampleHref }: { sampleHref: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative mx-auto w-full max-w-[380px]">
      {/* stacked paper behind the card for depth */}
      <div aria-hidden className="absolute inset-x-6 -bottom-3 h-full rounded-[2rem] bg-petal-deep" />
      <div aria-hidden className="absolute inset-x-3 -bottom-1.5 h-full rounded-[2rem] bg-[#F7C9E0]" />

      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-plum p-6 text-white shadow-card sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/90 ring-1 ring-inset ring-white/15">
            <Lock className="size-3.5" aria-hidden />
            {open ? 'Unsealed' : 'Sealed'}
          </span>
          <span className="text-xs font-semibold text-white/55">Sample gift</span>
        </div>

        {/* The box */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-pressed={open}
          aria-label={open ? 'Seal the sample gift again' : 'Peek inside the sample gift'}
          className="group relative mx-auto mt-5 grid aspect-square w-[78%] place-items-center rounded-[1.75rem] bg-white/[0.06] ring-1 ring-inset ring-white/10 transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] active:scale-[0.98]"
        >
          {/* ribbon */}
          <span
            aria-hidden
            className={`absolute inset-y-0 left-1/2 w-7 -translate-x-1/2 bg-gradient-to-b from-[#FF3FA4] to-[#B4005E] transition-all duration-700 ease-[cubic-bezier(.16,1,.3,1)] ${open ? 'translate-y-[-110%] opacity-0' : 'gn-sheen overflow-hidden'}`}
          />
          <span
            aria-hidden
            className={`absolute inset-x-0 top-1/2 h-7 -translate-y-1/2 bg-gradient-to-r from-[#FF3FA4] to-[#B4005E] transition-all duration-700 ease-[cubic-bezier(.16,1,.3,1)] ${open ? 'translate-x-[110%] opacity-0' : ''}`}
          />
          {/* bow */}
          <span
            aria-hidden
            className={`absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF3FA4] ring-4 ring-[#B4005E] transition-all duration-500 ${open ? 'scale-0 opacity-0' : 'gn-breathe'}`}
          />

          {/* inside */}
          <span
            className={`relative flex flex-col items-center px-4 text-center transition-all duration-700 ease-[cubic-bezier(.16,1,.3,1)] ${open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
          >
            <span className="font-display text-[2.6rem] font-extrabold leading-none tracking-tight sm:text-5xl">₦25,000</span>
            <span className="mt-2 text-sm font-semibold text-white/75">and a voice note</span>
          </span>

          {!open && (
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3.5 py-1.5 text-xs font-extrabold text-plum shadow-soft transition group-hover:-translate-y-0.5">
              Tap to peek
            </span>
          )}
        </button>

        {/* Message strip */}
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/[0.07] p-3 ring-1 ring-inset ring-white/10">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-magenta">
            {open ? <Play className="size-4 fill-current" aria-hidden /> : <Mic className="size-4" aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">
              {open ? 'From Tolu, your sister' : 'From someone who loves you'}
            </p>
            {/* waveform */}
            <div aria-hidden className="mt-1.5 flex h-4 items-end gap-[3px]">
              {[5, 9, 14, 7, 12, 16, 10, 6, 13, 9, 15, 8, 11, 6, 12, 9, 5, 10].map((h, i) => (
                <span
                  key={i}
                  className={`w-[3px] rounded-full transition-colors duration-500 ${open && i < 7 ? 'bg-[#FF3FA4]' : 'bg-white/35'}`}
                  style={{ height: h }}
                />
              ))}
            </div>
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-white/60">0:24</span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {open ? (
            <>
              <Link
                href={sampleHref}
                className="flex h-12 flex-1 items-center justify-center rounded-full bg-white text-sm font-extrabold text-plum transition hover:bg-petal active:scale-[0.98]"
              >
                Open the full sample
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Seal again"
                className="grid size-12 place-items-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/15 transition hover:bg-white/15"
              >
                <RotateCcw className="size-4" aria-hidden />
              </button>
            </>
          ) : (
            <p className="text-xs leading-relaxed text-white/60">
              The sender and the gift stay hidden until the message plays.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
