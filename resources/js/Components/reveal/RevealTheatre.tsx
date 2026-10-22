import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Lock, Play, Mic, PenLine, Square, Send, Check, Loader2, ChevronLeft, Volume2, VolumeX,
  Smartphone, Wifi, Zap, Wallet, CreditCard, Landmark, RotateCcw, ShieldCheck,
} from 'lucide-react';
import { unlockRevealSound, playRevealSound, playCountdownTick, setRevealMuted, isRevealMuted } from './revealSound';

/**
 * Giftnify mystery reveal.
 *
 * Sequence (the order is the product):
 *   sealed  → hint + "Play the message"            (tap unlocks sound)
 *   message → video / voice / letter
 *   hold    → REVEAL_PAUSE_MS of total stillness   (never zero)
 *   countdown → 5…1, a tick each second, the suspense
 *   reveal  → name dissolves out of blur + sound + value lands, same frame
 *   actions → Reply first, "Use my gift" second
 *
 * Framework-free: the website (Inertia) and the app (TanStack) pass an `api`
 * adapter. Keep both copies identical:
 *   resources/js/Components/reveal/RevealTheatre.tsx
 *   src/components/giftnify/reveal/RevealTheatre.tsx
 */

/* ---------- Timing — tune here, nowhere else ---------- */
/** Silence and stillness between the message ending and the name appearing. Test 500–1500, never 0. */
export const REVEAL_PAUSE_MS = 500;
/** Suspense countdown before the sender appears. */
export const COUNTDOWN_SECONDS = 5;
/** How long the blur takes to clear. Slow on purpose. */
export const DISSOLVE_MS = 1800;
/** How long the value takes to count up. Starts on the same frame as the dissolve. */
const COUNT_MS = 1300;

export type MessageType = 'text' | 'audio' | 'video';

export interface RevealGift {
  token: string;
  isDemo: boolean;
  recipientName: string;
  occasion: string;
  messageType: MessageType;
  messageText: string;
  mediaUrl?: string | null;
  hint?: string | null;
  revealed: boolean;
  hasReply: boolean;
}

export interface RevealData {
  senderName: string;
  senderFirst: string;
  currency: string;
  amount: number;
  item?: string | null;
  redeemed: boolean;
  signedIn?: boolean;
  /** Present when the cash landed in the recipient's Giftnify wallet at the reveal. */
  wallet?: { credited: boolean; balance: number; currency: string } | null;
  /** When the gift was addressed to a phone/email, a one-time code proves it's them before money moves. */
  verify?: { required: boolean; channel: 'email' | 'phone' | null; destination: string | null } | null;
}

export type ClaimResult = { result: string; balance?: number | null; currency?: string | null };

export type RedeemResult = 'ok' | 'already_redeemed' | 'expired' | 'refunded' | 'rate_limited' | 'not_revealed' | 'error';

export interface RevealApi {
  /** Fire-and-forget: the recipient started the message. */
  markOpened(): void;
  /** Who sent it and what it is. Only callable after markOpened. */
  reveal(): Promise<RevealData>;
  reply(input: { text?: string; voice?: Blob }): Promise<'ok' | 'already_replied' | 'unavailable' | 'error'>;
  redeem(method: string, details: Record<string, string>): Promise<RedeemResult>;
  verifyBank?(bank: string, account: string): Promise<string | null>;
  /** Adds the gift to the signed-in user's Giftnify wallet. */
  claim?(): Promise<ClaimResult>;
  /** ok | rate_limited | unavailable | not_needed */
  sendCode?(): Promise<string>;
  /** ok | wrong | expired | locked */
  verifyCode?(code: string): Promise<string>;
}

interface Props {
  gift: RevealGift;
  api: RevealApi;
  /** Renders the brand's 3D icon (each platform has its own asset pipeline). */
  icon: (name: 'gift' | 'giftOpen' | 'mic', size: number) => ReactNode;
  logo?: ReactNode;
  createHref?: string;
  walletHref?: string;
  /** Bank names for payouts (from the payment provider when connected). */
  banks?: string[];
  /** Where a guest signs in to add the gift to a wallet (should return to this gift). */
  signInHref?: string;
}

type Stage = 'sealed' | 'message' | 'hold' | 'countdown' | 'reveal' | 'redeem' | 'done';

const FALLBACK_HINT = 'Someone who thought of you the moment this day came around.';

const VERB: Record<MessageType, { cta: string; noun: string; verb: string }> = {
  video: { cta: 'Watch the message', noun: 'video', verb: 'Watch' },
  audio: { cta: 'Listen to the message', noun: 'voice note', verb: 'Listen to' },
  text: { cta: 'Read the message', noun: 'letter', verb: 'Read' },
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function formatValue(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: amount % 1 ? 2 : 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function RevealTheatre({ gift, api, icon, logo, createHref = '/create', walletHref = '/wallet', signInHref, banks }: Props) {
  const [stage, setStage] = useState<Stage>('sealed');
  const [data, setData] = useState<RevealData | null>(null);
  const [frame, setFrame] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [muted, setMuted] = useState(isRevealMuted());
  const revealPromise = useRef<Promise<RevealData> | null>(null);

  // Fetch the reveal a moment early (near the end of playback) so the pause
  // is never stretched by the network.
  const prefetch = useCallback(() => {
    if (!revealPromise.current) {
      revealPromise.current = api.reveal();
      revealPromise.current.catch(() => { revealPromise.current = null; });
    }
    return revealPromise.current;
  }, [api]);

  const start = () => {
    unlockRevealSound();
    api.markOpened();
    setStage('message');
  };

  const onMessageEnd = useCallback(async (lastFrame?: string | null) => {
    setFrame(lastFrame ?? null);
    setStage('hold');
    await new Promise((r) => setTimeout(r, REVEAL_PAUSE_MS));
    // Start loading during the countdown so the name is ready the instant it hits zero.
    void prefetch().catch(() => {});
    setStage('countdown');
  }, [prefetch]);

  const onCountdownEnd = useCallback(async () => {
    try {
      const result = await prefetch();
      setData(result);
      // Sound, confetti, dissolve and value all begin on this one render.
      playRevealSound();
      setStage('reveal');
    } catch {
      setFailure("We couldn't open the gift. Check your connection, then try again.");
      setStage('message');
    }
  }, [prefetch]);

  // Returning visitor who already saw the reveal: skip straight to it.
  const skipToGift = async () => {
    unlockRevealSound();
    try {
      setData(await prefetch());
      setStage('reveal');
    } catch {
      setFailure("We couldn't open the gift. Check your connection, then try again.");
    }
  };

  return (
    <div className="relative isolate min-h-[100dvh] overflow-hidden bg-gradient-plum text-white">
      {/* Frozen last frame of the sender's video, softening behind the name */}
      {frame && (stage === 'hold' || stage === 'countdown' || stage === 'reveal') && (
        <div aria-hidden className="absolute inset-0 -z-10">
          <img src={frame} alt="" className={`size-full object-cover ${stage === 'reveal' ? 'gn-frame-soften' : stage === 'countdown' ? 'blur-md brightness-50 transition duration-[2000ms]' : 'brightness-90'}`} style={{ ['--gn-dissolve-ms' as any]: `${DISSOLVE_MS}ms` }} />
        </div>
      )}

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-[max(env(safe-area-inset-top),16px)]">
        <header className="flex h-14 items-center justify-between">
          {logo}
          <button
            type="button"
            onClick={() => { const m = !muted; setMuted(m); setRevealMuted(m); }}
            aria-label={muted ? 'Turn reveal sound on' : 'Turn reveal sound off'}
            className="grid size-11 place-items-center rounded-full bg-white/10 text-white/80 ring-1 ring-inset ring-white/15 transition hover:bg-white/15"
          >
            {muted ? <VolumeX className="size-[18px]" aria-hidden /> : <Volume2 className="size-[18px]" aria-hidden />}
          </button>
        </header>

        <div className="flex flex-1 flex-col justify-center py-6">
          {stage === 'sealed' && (
            <Sealed gift={gift} icon={icon} onStart={start} onSkip={gift.revealed ? skipToGift : undefined} failure={failure} />
          )}
          {(stage === 'message' || stage === 'hold') && (
            <MessageStage
              gift={gift}
              icon={icon}
              holding={stage === 'hold'}
              onNearEnd={() => { void prefetch().catch(() => {}); }}
              onEnd={onMessageEnd}
              failure={failure}
            />
          )}
          {stage === 'countdown' && <Countdown onDone={onCountdownEnd} />}
          {stage === 'reveal' && <ConfettiBurst />}
          {stage === 'reveal' && data && (
            <RevealStage gift={gift} data={data} api={api} hasFrame={!!frame} walletHref={walletHref} onUse={() => setStage('redeem')} />
          )}
          {stage === 'redeem' && data && (
            <Redeem gift={gift} data={data} api={api} signInHref={signInHref} banks={banks} onBack={() => setStage('reveal')}
              onDone={(wallet) => { if (wallet) setData({ ...data, wallet, redeemed: true }); setStage('done'); }} />
          )}
          {stage === 'done' && data && (
            <div className="gn-rise text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#0E9F6E]/20 text-[#5EE0AE]">
                <Check className="size-8" aria-hidden />
              </span>
              {data.wallet?.credited ? (
                <>
                  <h2 className="mt-5 font-display text-3xl font-extrabold">Added to your wallet</h2>
                  <p className="mx-auto mt-2 max-w-xs text-white/70">Your balance is now {formatValue(data.wallet.balance, data.wallet.currency)}. Withdraw it whenever you like.</p>
                  <a href={walletHref} className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-gradient-primary font-extrabold text-white shadow-glow">Open my wallet</a>
                </>
              ) : (
                <>
                  <h2 className="mt-5 font-display text-3xl font-extrabold">It's on its way</h2>
                  <p className="mx-auto mt-2 max-w-xs text-white/70">We've recorded how you'd like to receive it. {data.senderFirst} will see that you opened it.</p>
                </>
              )}
              <a href={createHref} className="mt-8 inline-flex h-13 min-h-12 w-full items-center justify-center rounded-full bg-white px-6 font-extrabold text-plum transition hover:bg-petal">
                Send someone a mystery gift
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */

function Sealed({ gift, icon, onStart, onSkip, failure }: {
  gift: RevealGift; icon: Props['icon']; onStart: () => void; onSkip?: () => void; failure: string | null;
}) {
  const v = VERB[gift.messageType] ?? VERB.text;
  const hint = gift.hint?.trim() || FALLBACK_HINT;
  return (
    <div className="text-center">
      <div className="relative mx-auto grid size-44 place-items-center">
        <span aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgba(229,0,125,.35),transparent)]" />
        <span className="gn-breathe relative">{icon('gift', 150)}</span>
        <span className="absolute bottom-2 right-3 grid size-11 place-items-center rounded-full bg-plum ring-4 ring-plum">
          <Lock className="size-[18px] text-[#FF8AC4]" aria-hidden />
        </span>
      </div>

      <h1 className="mt-8 font-display text-[2.4rem] font-extrabold leading-[1.02] tracking-tight">
        {gift.recipientName && gift.recipientName !== 'You' ? `${gift.recipientName}, you got a gift.` : 'You got a gift.'}
      </h1>

      <figure className="mx-auto mt-6 max-w-sm rounded-[1.5rem] bg-white/[0.07] px-5 py-4 text-left ring-1 ring-inset ring-white/10">
        <figcaption className="text-xs font-bold text-[#FF8AC4]">A hint</figcaption>
        <blockquote className="mt-1.5 font-display text-[1.15rem] font-semibold leading-snug text-white/95">{hint}</blockquote>
      </figure>

      <p className="mx-auto mt-5 max-w-xs text-sm text-white/60">
        {v.verb} their {v.noun} to find out who sent it and what's inside.
      </p>

      {failure && <p role="alert" className="mt-4 rounded-xl bg-white/10 p-3 text-sm">{failure}</p>}

      <button
        type="button"
        onClick={onStart}
        className="mt-7 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-primary text-base font-extrabold text-white shadow-glow transition active:scale-[0.98]"
      >
        {gift.messageType !== 'text' && <Play className="size-5 fill-current" aria-hidden />}
        {v.cta}
      </button>
      {onSkip && (
        <button type="button" onClick={onSkip} className="mt-3 h-12 w-full rounded-full text-sm font-bold text-white/75 transition hover:text-white">
          You've opened this before. Go to your gift
        </button>
      )}
    </div>
  );
}

/* ================================================================== */

function MessageStage({ gift, icon, holding, onNearEnd, onEnd, failure }: {
  gift: RevealGift; icon: Props['icon']; holding: boolean;
  onNearEnd: () => void; onEnd: (frame?: string | null) => void; failure: string | null;
}) {
  const isText = gift.messageType === 'text' || !gift.mediaUrl;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [readable, setReadable] = useState(false);
  const nearEndSent = useRef(false);
  const ended = useRef(false);

  // Letters: give enough time to actually read (about 4 words a second, at least 2.5s).
  const readMs = useMemo(() => {
    const words = (gift.messageText || '').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(2500, Math.min(9000, (words / 4) * 1000));
  }, [gift.messageText]);

  useEffect(() => {
    if (!isText) return;
    const near = setTimeout(onNearEnd, Math.max(0, readMs - 800));
    const t = setTimeout(() => setReadable(true), readMs);
    return () => { clearTimeout(near); clearTimeout(t); };
  }, [isText, readMs, onNearEnd]);

  const finish = () => {
    if (ended.current) return;
    ended.current = true;
    let frame: string | null = null;
    const v = videoRef.current;
    if (v && v.videoWidth) {
      try {
        const c = document.createElement('canvas');
        c.width = Math.min(v.videoWidth, 720);
        c.height = Math.round((c.width / v.videoWidth) * v.videoHeight);
        c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
        frame = c.toDataURL('image/jpeg', 0.82);
      } catch {
        frame = null; // cross-origin media can't be read; the plum backdrop is used instead
      }
    }
    onEnd(frame);
  };

  const onTime = (el: HTMLMediaElement) => {
    if (!el.duration || !Number.isFinite(el.duration)) return;
    const p = (el.currentTime / el.duration) * 100;
    setProgress(p);
    if (p >= 85 && !nearEndSent.current) { nearEndSent.current = true; onNearEnd(); }
  };

  return (
    <div>
      <div className="overflow-hidden rounded-[2rem] bg-white/[0.06] ring-1 ring-inset ring-white/10">
        {isText ? (
          <div className="p-7">
            <p className="whitespace-pre-line font-display text-[1.45rem] font-semibold leading-snug">{gift.messageText}</p>
            <p className="mt-6 text-right text-sm font-semibold text-white/45" aria-label="Sender hidden">— ?</p>
          </div>
        ) : gift.messageType === 'video' ? (
          <video
            ref={videoRef}
            src={gift.mediaUrl!}
            autoPlay
            playsInline
            controls={!holding}
            crossOrigin="anonymous"
            className="aspect-[4/5] w-full bg-black object-cover"
            onTimeUpdate={(e) => onTime(e.currentTarget)}
            onEnded={finish}
            onError={finish}
          />
        ) : (
          <div className="grid aspect-[4/5] place-items-center px-6 text-center">
            <div className="w-full">
              <div className="flex justify-center">{icon('mic', 96)}</div>
              <audio
                src={gift.mediaUrl!}
                autoPlay
                controls={!holding}
                className="mt-6 w-full"
                onTimeUpdate={(e) => onTime(e.currentTarget)}
                onEnded={finish}
                onError={finish}
              />
            </div>
          </div>
        )}
      </div>

      {!isText && (
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Message progress">
          <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${holding ? 100 : progress}%` }} />
        </div>
      )}

      {failure && <p role="alert" className="mt-4 rounded-xl bg-white/10 p-3 text-sm">{failure}</p>}

      {/* During the hold nothing moves and nothing is offered. */}
      {!holding && (
        isText ? (
          <button
            type="button"
            onClick={finish}
            disabled={!readable}
            className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-base font-extrabold text-plum transition active:scale-[0.98] disabled:bg-white/15 disabled:text-white/60"
          >
            {readable ? "I've read it. Who's it from?" : <><Lock className="size-4" aria-hidden /> Take a moment to read</>}
          </button>
        ) : (
          <p className="mt-4 text-center text-sm text-white/60">The sender appears when the {VERB[gift.messageType].noun} ends.</p>
        )
      )}
    </div>
  );
}

/* ================================================================== */

function Countdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(COUNTDOWN_SECONDS);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    playCountdownTick(COUNTDOWN_SECONDS, COUNTDOWN_SECONDS);
    let left = COUNTDOWN_SECONDS;
    const t = setInterval(() => {
      left -= 1;
      if (left <= 0) { clearInterval(t); done.current(); return; }
      setN(left);
      playCountdownTick(left, COUNTDOWN_SECONDS);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const R = 88;
  const C = 2 * Math.PI * R;
  return (
    <div className="text-center" role="timer" aria-live="assertive" aria-label={`Revealing in ${n}`}>
      <p className="text-lg font-semibold text-white/75">Who sent it?</p>
      <div className="relative mx-auto mt-6 grid size-56 place-items-center">
        <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-[#E5007D]/15 [animation-duration:1s]" />
        <svg aria-hidden viewBox="0 0 200 200" className="absolute inset-0 -rotate-90">
          <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="6" />
          <circle
            cx="100" cy="100" r={R} fill="none" stroke="url(#gn-cd)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={C}
            className="gn-countdown-ring"
            style={{ ['--gn-c' as any]: C, ['--gn-cd-ms' as any]: `${COUNTDOWN_SECONDS * 1000}ms` }}
          />
          <defs>
            <linearGradient id="gn-cd" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FF8AC4" />
              <stop offset="1" stopColor="#E5007D" />
            </linearGradient>
          </defs>
        </svg>
        <span key={n} className="gn-count font-display text-[7rem] font-extrabold leading-none tabular-nums">{n}</span>
      </div>
      <p className="mt-6 text-sm text-white/60">Revealing the sender in {n} {n === 1 ? 'second' : 'seconds'}</p>
    </div>
  );
}

/** Brand confetti with a few gold coins, drawn on one canvas. Runs ~4s, then removes itself. */
function ConfettiBurst() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [gone, setGone] = useState(prefersReducedMotion());
  useEffect(() => {
    if (gone) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    const COLORS = ['#E5007D', '#FF8AC4', '#FFD1E6', '#B4005E', '#FFFFFF', '#F6C35B'];
    type P = { x: number; y: number; vx: number; vy: number; r: number; spin: number; a: number; w: number; h: number; c: string; coin: boolean };
    const parts: P[] = [];
    const burst = (ox: number, oy: number, dir: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = (-90 + dir * (15 + Math.random() * 45)) * (Math.PI / 180);
        const speed = 9 + Math.random() * 9;
        const coin = Math.random() < 0.14;
        parts.push({
          x: ox, y: oy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          r: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 0.35, a: 1,
          w: coin ? 9 : 6 + Math.random() * 6, h: coin ? 9 : 10 + Math.random() * 8,
          c: coin ? '#F6C35B' : COLORS[i % COLORS.length], coin,
        });
      }
    };
    burst(W * 0.08, H * 0.92, 1, 90);
    burst(W * 0.92, H * 0.92, -1, 90);
    burst(W * 0.5, H * 0.38, 0.4, 40);
    let raf = 0;
    const t0 = performance.now();
    const frame = (now: number) => {
      const t = now - t0;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy; p.r += p.spin;
        if (t > 2600) p.a = Math.max(0, p.a - 0.02);
        ctx.save();
        ctx.globalAlpha = p.a;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        if (p.coin) {
          ctx.scale(Math.abs(Math.cos(p.r * 2)) + 0.15, 1);
          ctx.beginPath(); ctx.arc(0, 0, p.w, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.45)';
          ctx.beginPath(); ctx.arc(-2, -2, p.w * 0.45, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r)) + 2);
        }
        ctx.restore();
      }
      if (t < 4200) raf = requestAnimationFrame(frame); else setGone(true);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [gone]);
  if (gone) return null;
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-50 size-full" />;
}

/* ================================================================== */

function CountUp({ to, currency }: { to: number; currency: string }) {
  const [v, setV] = useState(prefersReducedMotion() ? to : 0);
  useEffect(() => {
    if (prefersReducedMotion()) { setV(to); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / COUNT_MS);
      const eased = 1 - Math.pow(1 - k, 4);
      setV(k >= 1 ? to : to * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  const shown = to % 1 ? v : Math.round(v);
  return <>{formatValue(shown, currency)}</>;
}

function RevealStage({ gift, data, api, hasFrame, walletHref, onUse }: {
  gift: RevealGift; data: RevealData; api: RevealApi; hasFrame: boolean; walletHref: string; onUse: () => void;
}) {
  const [settled, setSettled] = useState(prefersReducedMotion());
  const [mode, setMode] = useState<'choose' | 'voice' | 'text' | 'sent'>(gift.hasReply ? 'sent' : 'choose');
  useEffect(() => {
    if (settled) return;
    const t = setTimeout(() => setSettled(true), DISSOLVE_MS);
    return () => clearTimeout(t);
  }, [settled]);

  const initials = data.senderName.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const style = { ['--gn-dissolve-ms' as any]: `${DISSOLVE_MS}ms` };

  return (
    <div className="text-center">
      {/* The moment */}
      <div className="relative" style={style}>
        <span aria-hidden className="gn-bloom pointer-events-none absolute left-1/2 top-12 -z-10 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full" />
        <p className="text-base font-semibold text-white/70">It's from</p>
        <div className="gn-dissolve">
          <span className={`mx-auto mt-4 grid size-28 place-items-center rounded-full font-display text-4xl font-extrabold ring-4 ring-white/20 ${hasFrame ? 'bg-white/15 backdrop-blur' : 'bg-gradient-primary'}`}>
            {initials}
          </span>
          <h1 className="mt-5 font-display text-[2.7rem] font-extrabold leading-[1.02] tracking-tight" aria-live="polite">
            {data.senderName}
          </h1>
        </div>
      </div>

      {/* The value lands on the same frame as the name */}
      <div className="mx-auto mt-7 max-w-sm rounded-[1.5rem] bg-white/[0.08] p-5 ring-1 ring-inset ring-white/15 backdrop-blur-sm">
        <p className="font-display text-[2.6rem] font-extrabold leading-none tracking-tight tabular-nums">
          {data.item ? data.item : <CountUp to={data.amount} currency={data.currency} />}
        </p>
        {data.wallet?.credited ? (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-[#7EF0C4]">
            <Wallet className="size-4" aria-hidden />
            Added to your wallet. Balance <span className="tabular-nums"><CountUp to={data.wallet.balance} currency={data.wallet.currency} /></span>
          </p>
        ) : (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-[#7EF0C4]">
            <ShieldCheck className="size-4" aria-hidden />
            {data.redeemed ? 'Already received' : data.verify?.required ? "Yours now. You'll confirm it's you before receiving it." : 'Yours now. Held safely until you choose how to receive it.'}
          </p>
        )}
      </div>

      {/* Reply first, money second. Space is reserved so nothing jumps when it appears. */}
      <div className={`mt-7 text-left ${settled ? 'gn-rise' : 'invisible'}`} aria-hidden={!settled}>
          {mode === 'choose' && (
            <>
              <p className="text-center text-sm font-semibold text-white/80">Tell {data.senderFirst} how it felt, while it's fresh.</p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <button type="button" onClick={() => setMode('voice')} className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white font-extrabold text-plum transition hover:bg-petal active:scale-[0.98]">
                  <Mic className="size-5" aria-hidden /> Voice note
                </button>
                <button type="button" onClick={() => setMode('text')} className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white/12 font-extrabold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/20 active:scale-[0.98]">
                  <PenLine className="size-5" aria-hidden /> Write back
                </button>
              </div>
            </>
          )}
          {mode === 'voice' && <VoiceReply first={data.senderFirst} api={api} onSent={() => setMode('sent')} onCancel={() => setMode('choose')} />}
          {mode === 'text' && <TextReply first={data.senderFirst} api={api} onSent={() => setMode('sent')} onCancel={() => setMode('choose')} />}
          {mode === 'sent' && (
            <p className="flex items-center justify-center gap-2 rounded-2xl bg-white/[0.07] p-3.5 text-sm font-semibold">
              <Check className="size-4 text-[#7EF0C4]" aria-hidden /> {data.senderFirst} will get your reply.
            </p>
          )}

          {data.wallet?.credited && (
            <a
              href={walletHref}
              className={`mt-3 inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-bold transition ${mode === 'sent' ? 'bg-gradient-primary text-white shadow-glow' : 'text-white/75 hover:text-white'}`}
            >
              Open my wallet
            </a>
          )}
          {!data.redeemed && (
            <button
              type="button"
              onClick={onUse}
              className={`mt-3 h-12 w-full rounded-full text-sm font-bold transition ${mode === 'sent' ? 'bg-gradient-primary text-white shadow-glow' : 'text-white/75 hover:text-white'}`}
            >
              {data.item ? 'Choose how to receive your gift' : 'Use my gift'}
            </button>
          )}
      </div>
    </div>
  );
}

/* ---------- Replies ---------- */

function TextReply({ first, api, onSent, onCancel }: { first: string; api: RevealApi; onSent: () => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true); setErr(null);
    const r = await api.reply({ text: text.trim() }).catch(() => 'error' as const);
    setBusy(false);
    if (r === 'ok' || r === 'already_replied') onSent();
    else setErr(r === 'unavailable' ? 'Replies are not switched on yet.' : 'Your reply did not send. Try again.');
  };
  return (
    <div className="rounded-[1.5rem] bg-white/[0.07] p-4 ring-1 ring-inset ring-white/10">
      <label htmlFor="gn-reply-text" className="text-sm font-bold">Your reply to {first}</label>
      <textarea
        id="gn-reply-text"
        autoFocus
        rows={3}
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Say what you're feeling right now…"
        className="mt-2 w-full resize-none rounded-2xl bg-white/10 p-3.5 text-[16px] text-white outline-none ring-1 ring-inset ring-white/15 placeholder:text-white/40 focus:ring-[#FF8AC4]"
      />
      {err && <p role="alert" className="mt-2 text-sm text-[#FFB4C8]">{err}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onCancel} className="h-12 rounded-full px-4 text-sm font-bold text-white/70 hover:text-white">Back</button>
        <button type="button" onClick={send} disabled={!text.trim() || busy} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white font-extrabold text-plum transition disabled:opacity-50">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />} Send to {first}
        </button>
      </div>
    </div>
  );
}

function VoiceReply({ first, api, onSent, onCancel }: { first: string; api: RevealApi; onSent: () => void; onCancel: () => void }) {
  const [state, setState] = useState<'idle' | 'recording' | 'review' | 'sending'>('idle');
  const [secs, setSecs] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const LIMIT = 60;

  const stopAll = () => {
    if (timer.current) clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
  };
  useEffect(() => () => { stopAll(); if (url) URL.revokeObjectURL(url); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    setErr(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const r = new MediaRecorder(s);
      const chunks: BlobPart[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        const b = new Blob(chunks, { type: r.mimeType || 'audio/webm' });
        setBlob(b);
        setUrl(URL.createObjectURL(b));
        setState('review');
        stopAll();
      };
      rec.current = r;
      r.start();
      setSecs(0);
      setState('recording');
      timer.current = setInterval(() => setSecs((n) => {
        if (n + 1 >= LIMIT) r.state === 'recording' && r.stop();
        return n + 1;
      }), 1000);
    } catch {
      setErr('Allow microphone access to record, or write back instead.');
    }
  };

  const send = async () => {
    if (!blob) return;
    setState('sending');
    const r = await api.reply({ voice: blob }).catch(() => 'error' as const);
    if (r === 'ok' || r === 'already_replied') onSent();
    else { setState('review'); setErr(r === 'unavailable' ? 'Replies are not switched on yet.' : 'Your voice note did not send. Try again.'); }
  };

  return (
    <div className="rounded-[1.5rem] bg-white/[0.07] p-4 ring-1 ring-inset ring-white/10">
      <p className="text-sm font-bold">A voice note for {first}</p>
      {state === 'review' || state === 'sending' ? (
        <audio src={url ?? undefined} controls className="mt-3 w-full" />
      ) : (
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={state === 'recording' ? () => rec.current?.stop() : start}
            aria-label={state === 'recording' ? 'Stop recording' : 'Start recording'}
            className={`grid size-14 shrink-0 place-items-center rounded-full transition active:scale-95 ${state === 'recording' ? 'bg-white text-magenta' : 'bg-gradient-primary text-white shadow-glow'}`}
          >
            {state === 'recording' ? <Square className="size-5 fill-current" aria-hidden /> : <Mic className="size-6" aria-hidden />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{state === 'recording' ? 'Recording… tap to stop' : 'Tap to record'}</p>
            <p className="text-xs tabular-nums text-white/60">0:{String(secs).padStart(2, '0')} / 1:00</p>
          </div>
        </div>
      )}
      {err && <p role="alert" className="mt-2 text-sm text-[#FFB4C8]">{err}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => { stopAll(); onCancel(); }} className="h-12 rounded-full px-4 text-sm font-bold text-white/70 hover:text-white">Back</button>
        {(state === 'review' || state === 'sending') && (
          <>
            <button type="button" onClick={() => { setBlob(null); setState('idle'); setSecs(0); }} aria-label="Record again" className="grid size-12 place-items-center rounded-full bg-white/10 ring-1 ring-inset ring-white/15">
              <RotateCcw className="size-4" aria-hidden />
            </button>
            <button type="button" onClick={send} disabled={state === 'sending'} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white font-extrabold text-plum disabled:opacity-60">
              {state === 'sending' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />} Send to {first}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- One-time code: proves they hold the phone/email the gift was sent to ---------- */

const CODE_ERRORS: Record<string, string> = {
  wrong: "That code isn't right. Check it and try again.",
  expired: 'That code has expired. Send a new one.',
  locked: 'Too many tries. Send a new code.',
  rate_limited: 'Codes were sent several times already. Wait a few minutes, then try again.',
  unavailable: "We couldn't send a code right now. Try again in a minute.",
  error: 'Something went wrong. Try again.',
};

function VerifyStep({ data, api, onVerified }: { data: RevealData; api: RevealApi; onVerified: () => void }) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const where = data.verify?.destination ?? (data.verify?.channel === 'email' ? 'your email' : 'your phone');

  const send = async () => {
    if (!api.sendCode || busy) return;
    setBusy(true); setMsg(null);
    const r = await api.sendCode().catch(() => 'error');
    setBusy(false);
    if (r === 'ok') { setSent(true); setCode(''); }
    else if (r === 'not_needed') onVerified();
    else setMsg(CODE_ERRORS[r] ?? CODE_ERRORS.error);
  };

  const check = async () => {
    if (!api.verifyCode || code.length !== 6 || busy) return;
    setBusy(true); setMsg(null);
    const r = await api.verifyCode(code).catch(() => 'error');
    setBusy(false);
    if (r === 'ok') onVerified();
    else setMsg(CODE_ERRORS[r] ?? CODE_ERRORS.error);
  };

  return (
    <div className="mt-6 rounded-[1.25rem] bg-white/[0.07] p-4 ring-1 ring-inset ring-white/10">
      <p className="font-bold">First, confirm it's you</p>
      <p className="mt-1 text-sm text-white/70">
        {data.senderFirst} sent this gift to {where}. We'll send a 6-digit code there.
      </p>
      {!sent ? (
        <button type="button" onClick={send} disabled={busy} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white font-extrabold text-plum disabled:opacity-60">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Send my code
        </button>
      ) : (
        <div className="mt-4 grid gap-2">
          <label htmlFor="gn-code" className="text-sm font-semibold">Code sent to {where}</label>
          <input
            id="gn-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && check()}
            className="h-14 rounded-2xl bg-white/10 px-4 text-center font-display text-2xl font-extrabold tracking-[0.4em] text-white outline-none ring-1 ring-inset ring-white/15 focus:ring-[#FF8AC4]"
          />
          <button type="button" onClick={check} disabled={busy || code.length !== 6} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white font-extrabold text-plum disabled:opacity-50">
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Confirm
          </button>
          <button type="button" onClick={send} disabled={busy} className="h-10 text-sm font-semibold text-white/70 hover:text-white">Send a new code</button>
        </div>
      )}
      {msg && <p role="alert" className="mt-3 text-sm text-[#FFB4C8]">{msg}</p>}
    </div>
  );
}

/* ---------- Redemption ---------- */

const METHODS = [
  { id: 'Bank Transfer', icon: Landmark },
  { id: 'Airtime Top-up', icon: Smartphone },
  { id: 'Data Bundle', icon: Wifi },
  { id: 'Electricity', icon: Zap },
  { id: 'Gift Card', icon: CreditCard },
];
const FALLBACK_BANKS = ['Access Bank', 'Fidelity Bank', 'First Bank of Nigeria', 'Guaranty Trust Bank', 'Kuda Bank', 'Moniepoint MFB', 'United Bank For Africa', 'Wema Bank', 'Zenith Bank'];

const REDEEM_ERRORS: Record<string, string> = {
  already_redeemed: 'This gift has already been received.',
  verify_required: 'Confirm the code we sent you first.',
  bank_not_found: "We couldn't find that account. Check the number and bank.",
  bank_unavailable: "Bank checks aren't available right now. Try again shortly, or choose another option.",
  expired: 'This gift has expired.',
  refunded: 'This gift was cancelled and refunded to the sender.',
  rate_limited: 'Too many attempts. Wait a minute, then try again.',
  not_revealed: 'Play the message first to unlock this gift.',
  error: 'Nothing was taken. Try again, or contact Giftnify support.',
};

type WalletState = { credited: boolean; balance: number; currency: string };

function Redeem({ gift, data, api, signInHref, banks, onBack, onDone }: {
  gift: RevealGift; data: RevealData; api: RevealApi; signInHref?: string; banks?: string[]; onBack: () => void; onDone: (wallet?: WalletState) => void;
}) {
  const [verified, setVerified] = useState(!data.verify?.required);
  const bankList = banks?.length ? banks : FALLBACK_BANKS;
  const [method, setMethod] = useState<string | null>(null);
  const [bank, setBank] = useState('');
  const [acct, setAcct] = useState('');
  const [acctName, setAcctName] = useState<string | null>(null);
  const [dest, setDest] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const verify = async (a: string) => {
    setAcct(a); setAcctName(null);
    if (a.length === 10 && bank && api.verifyBank) {
      setBusy(true);
      setAcctName((await api.verifyBank(bank, a).catch(() => null)) ?? '');
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!method || busy) return;
    setBusy(true); setErr(null);
    const details: Record<string, string> = method === 'Bank Transfer' ? { bank, account: acct, account_name: acctName ?? '' } : { destination: dest };
    const r = await api.redeem(method, details).catch(() => 'error' as const);
    setBusy(false);
    if (r === 'ok') onDone(); else setErr(REDEEM_ERRORS[r] ?? REDEEM_ERRORS.error);
  };

  const canUseWallet = !data.item && (!!api.claim || !!signInHref);
  const addToWallet = async () => {
    if (busy) return;
    if (!data.signedIn || !api.claim) {
      if (signInHref) window.location.href = signInHref;
      return;
    }
    setBusy(true); setErr(null);
    const r = await api.claim().catch(() => ({ result: 'error' } as ClaimResult));
    setBusy(false);
    if ((r.result === 'credited' || r.result === 'already_credited') && r.balance != null && r.currency) {
      onDone({ credited: true, balance: r.balance, currency: r.currency });
    } else {
      setErr(r.result === 'own_gift' ? "You can't add a gift you sent to your own wallet." : r.result === 'already_redeemed' ? REDEEM_ERRORS.already_redeemed : REDEEM_ERRORS.error);
    }
  };

  const field = 'h-12 w-full rounded-2xl bg-white/10 px-4 text-[16px] text-white outline-none ring-1 ring-inset ring-white/15 placeholder:text-white/40 focus:ring-[#FF8AC4]';

  return (
    <div className="gn-rise">
      <button type="button" onClick={method ? () => setMethod(null) : onBack} className="mb-4 inline-flex h-11 items-center gap-1 text-sm font-semibold text-white/70 hover:text-white">
        <ChevronLeft className="size-4" aria-hidden /> Back
      </button>
      <h2 className="font-display text-3xl font-extrabold leading-tight">How would you like it?</h2>
      <p className="mt-1 text-white/70">{data.item ?? formatValue(data.amount, data.currency)} from {data.senderFirst}</p>

      {!verified && (
        <VerifyStep data={data} api={api} onVerified={() => setVerified(true)} />
      )}

      {verified && !method && canUseWallet && (
        <button
          type="button"
          onClick={addToWallet}
          disabled={busy}
          className="mt-6 flex w-full items-center gap-4 rounded-[1.25rem] bg-white p-4 text-left text-plum transition hover:bg-petal disabled:opacity-60"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-white">
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Wallet className="size-5" aria-hidden />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold">Add to my Giftnify wallet</span>
            <span className="block text-sm text-plum/70">{data.signedIn ? 'Instant. Withdraw whenever you like.' : 'Sign in or create an account. Takes a minute.'}</span>
          </span>
        </button>
      )}
      {!method && err && <p role="alert" className="mt-3 rounded-xl bg-white/10 p-3 text-sm">{err}</p>}

      {!verified ? null : !method ? (
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {METHODS.map(({ id, icon: I }) => (
            <button key={id} type="button" onClick={() => setMethod(id)} className="flex min-h-[92px] flex-col items-start justify-between rounded-[1.25rem] bg-white/[0.07] p-4 text-left ring-1 ring-inset ring-white/10 transition hover:bg-white/[0.12] hover:ring-white/25">
              <I className="size-5 text-[#FF8AC4]" aria-hidden />
              <span className="text-sm font-bold">{id}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <p className="font-bold">{method}</p>
          {method === 'Bank Transfer' ? (
            <>
              <label className="sr-only" htmlFor="gn-bank">Bank</label>
              <select id="gn-bank" value={bank} onChange={(e) => setBank(e.target.value)} className={`${field} appearance-none`}>
                <option value="" className="text-black">Select your bank</option>
                {bankList.map((b) => <option key={b} className="text-black">{b}</option>)}
              </select>
              <label className="sr-only" htmlFor="gn-acct">Account number</label>
              <input id="gn-acct" className={field} inputMode="numeric" maxLength={10} placeholder="Account number (10 digits)" value={acct} onChange={(e) => verify(e.target.value.replace(/\D/g, ''))} />
              <p className="flex h-12 items-center gap-2 rounded-2xl bg-white/[0.05] px-4 text-sm">
                {busy ? <><Loader2 className="size-4 animate-spin" aria-hidden /> Checking account…</>
                  : acctName ? <><Check className="size-4 text-[#7EF0C4]" aria-hidden /> {acctName}{gift.isDemo && <span className="ml-auto text-xs text-white/50">Sample</span>}</>
                  : acctName === '' ? 'Account not found. Check the number and bank.' : <span className="text-white/45">Account name appears here</span>}
              </p>
            </>
          ) : (
            <>
              <label className="sr-only" htmlFor="gn-dest">Where to send it</label>
              <input id="gn-dest" className={field} value={dest} onChange={(e) => setDest(e.target.value)}
                placeholder={method === 'Electricity' ? 'Meter number' : method === 'Wallet' || method === 'Gift Card' ? 'Email address' : 'Phone number'} />
            </>
          )}
          {err && <p role="alert" className="rounded-xl bg-white/10 p-3 text-sm">{err}</p>}
          <button
            type="button"
            onClick={confirm}
            disabled={busy || (method === 'Bank Transfer' ? !acctName : dest.trim().length < 5)}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-primary font-extrabold text-white shadow-glow transition active:scale-[0.98] disabled:opacity-45"
          >
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <ShieldCheck className="size-5" aria-hidden />} Confirm
          </button>
          <p className="text-center text-xs text-white/55">
            {gift.isDemo ? 'Sample gift. Nothing is paid out.' : 'We record your choice right away. Payouts are processed by the Giftnify team.'}
          </p>
        </div>
      )}
    </div>
  );
}
