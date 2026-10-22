import React, { useMemo } from 'react';
import { Head } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { Wordmark } from '../../Layouts/AppLayout';
import { RevealTheatre, type RevealApi, type RevealGift, type RedeemResult } from '../../Components/reveal/RevealTheatre';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content || '';

async function post(url: string, body: unknown) {
  const isForm = body instanceof FormData;
  return fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf(), ...(isForm ? {} : { 'Content-Type': 'application/json' }) },
    body: isForm ? body : JSON.stringify(body),
  });
}

export default function Reveal({ gift, error, message, banks }: any) {
  const api = useMemo<RevealApi | null>(() => {
    if (!gift) return null;
    const t = encodeURIComponent(gift.token);
    return {
      markOpened: () => { void post(`/gift/${t}/status`, { status: 'Opened' }).catch(() => {}); },
      reveal: async () => {
        const res = await post(`/gift/${t}/reveal`, {});
        if (!res.ok) throw new Error(String(res.status));
        const d = await res.json();
        return {
          senderName: d.sender_name,
          senderFirst: d.sender_first,
          currency: d.currency,
          amount: Number(d.amount),
          item: d.item,
          redeemed: !!d.redeemed,
          signedIn: !!d.signed_in,
          wallet: d.wallet ?? null,
          verify: d.verify ?? null,
        };
      },
      reply: async ({ text, voice }) => {
        const form = new FormData();
        if (text) form.append('text', text);
        if (voice) form.append('voice', voice, voice.type.includes('mp4') ? 'reply.m4a' : 'reply.webm');
        const res = await post(`/gift/${t}/reply`, form);
        if (res.ok) return 'ok';
        if (res.status === 409) return 'already_replied';
        return 'error';
      },
      redeem: async (method, details) => {
        const res = await post('/gift/redeem', { token: gift.token, method, details });
        const d = await res.json().catch(() => ({}));
        return (d.result as RedeemResult) || 'error';
      },
      sendCode: async () => {
        const res = await post(`/gift/${t}/code`, {});
        const d = await res.json().catch(() => ({}));
        return d.result || (res.ok ? 'ok' : 'error');
      },
      verifyCode: async (code: string) => {
        const res = await post(`/gift/${t}/code/verify`, { code });
        const d = await res.json().catch(() => ({}));
        return d.result || (res.ok ? 'ok' : 'error');
      },
      claim: async () => {
        const res = await post(`/gift/${t}/claim`, {});
        if (res.status === 401 || res.status === 419) return { result: 'signed_out' };
        return res.json().catch(() => ({ result: 'error' }));
      },
      verifyBank: async (bank, account) => {
        const res = await post('/gift/verify-bank', { bank, account });
        if (!res.ok) return null; // not found or lookup unavailable
        const d = await res.json();
        return d.account_name || null;
      },
    };
  }, [gift]);

  if (error || !gift || !api) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-gradient-plum px-5 text-white">
        <Head title="Gift unavailable" />
        <div className="w-full max-w-md text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/10 text-[#FFC56B]">
            <AlertTriangle className="size-7" aria-hidden />
          </span>
          <h1 className="mt-5 font-display text-3xl font-extrabold">This gift can't be opened</h1>
          <p className="mt-2 text-white/70">{message || "This gift couldn't be found or is no longer available."}</p>
          <div className="mt-7 grid gap-2.5">
            <a href="/help" className="inline-flex h-12 items-center justify-center rounded-full bg-white font-extrabold text-plum">Get help</a>
            <a href="/" className="inline-flex h-12 items-center justify-center rounded-full text-sm font-bold text-white/75 hover:text-white">Go to Giftnify</a>
          </div>
        </div>
      </div>
    );
  }

  const revealGift: RevealGift = {
    token: gift.token,
    isDemo: !!gift.is_demo,
    recipientName: gift.recipient_name,
    occasion: gift.occasion,
    messageType: gift.message_type,
    messageText: gift.message_text || '',
    mediaUrl: gift.media_url,
    hint: gift.hint,
    revealed: !!gift.revealed,
    hasReply: !!gift.has_reply,
  };

  return (
    <>
      <Head title="You got a gift" />
      <RevealTheatre
        gift={revealGift}
        api={api}
        walletHref="/wallet"
        banks={banks}
        signInHref={`/login?redirect=${encodeURIComponent(`/gift/${gift.token}`)}`}
        logo={<a href="/" aria-label="Giftnify home"><Wordmark light /></a>}
        icon={(name, size) => (
          <img
            src={`/images/icons/${name === 'giftOpen' ? 'gift-open' : name}.webp`}
            alt=""
            aria-hidden
            width={size}
            height={size}
            draggable={false}
            className="shadow-icon select-none object-contain"
            style={{ width: size, height: size }}
          />
        )}
      />
    </>
  );
}
