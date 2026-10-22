import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { AppLayout } from '../../Layouts/AppLayout';
import { Icon3D } from '../../Components/Icon3D';
import { Check, Copy, Send } from 'lucide-react';

function mask(contact?: string | null) {
  if (!contact) return '';
  if (contact.includes('@')) {
    const [u, d] = contact.split('@');
    return `${u.slice(0, 1)}•••@${d}`;
  }
  return `••••${contact.slice(-4)}`;
}

export default function Success({ gift, share_link }: any) {
  const [copied, setCopied] = useState(false);
  const sentForYou = gift.delivery !== 'Link' && gift.recipient_contact;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(share_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the field is selectable as a fallback */
    }
  };

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`I sent you a mystery gift on Giftnify. Open it here: ${share_link}`)}`;

  return (
    <AppLayout>
      <Head title="Gift sent" />
      <div className="mx-auto max-w-lg space-y-6 py-4 pb-16 text-center">
        <span className="mx-auto grid size-28 place-items-center rounded-full bg-petal">
          <Icon3D name="gift" size="xl" className="!size-20" />
        </span>

        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink md:text-4xl">Your gift is sealed</h1>
          <p className="mx-auto mt-2 max-w-sm text-ink-soft">
            {sentForYou
              ? `We're sending ${gift.recipient_name}'s gift by ${gift.delivery} to ${mask(gift.recipient_contact)}. You'll get an email when they open it.`
              : `Share the link with ${gift.recipient_name}. Your name and the gift stay hidden until they play your message.`}
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-line bg-white p-5 text-left shadow-soft">
          <label htmlFor="share-link" className="text-sm font-bold text-ink">
            {sentForYou ? 'Their gift link (if you also want to share it)' : 'Their gift link'}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="share-link"
              readOnly
              value={share_link}
              onFocus={(e) => e.currentTarget.select()}
              className="h-12 min-w-0 flex-1 rounded-2xl border border-line bg-[#FFF8FB] px-4 text-sm text-ink"
            />
            <button type="button" onClick={copy} className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-2xl bg-petal px-4 text-sm font-bold text-magenta-deep">
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] font-extrabold text-[#0B3B1E]"
          >
            <Send className="size-4" aria-hidden /> Share on WhatsApp
          </a>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/activity" className="inline-flex h-12 items-center justify-center rounded-full border border-line font-bold text-ink hover:border-ink/25">
            Track your gifts
          </Link>
          <Link href="/create" className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-primary font-extrabold text-white shadow-glow">
            Send another gift
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
