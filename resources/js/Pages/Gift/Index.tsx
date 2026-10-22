import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { AppLayout } from '../../Layouts/AppLayout';
import { Icon3D } from '../../Components/Icon3D';
import { ExternalLink, Plus, MessageCircleHeart } from 'lucide-react';

const STATUS_TONE: Record<string, string> = {
  'Awaiting Payment': 'bg-[#FFF4E0] text-[#8A5A00]',
  Sent: 'bg-petal text-magenta-deep',
  Opened: 'bg-petal text-magenta-deep',
  'Message Viewed': 'bg-petal text-magenta-deep',
  Unlocked: 'bg-[#E6F7F0] text-[#0B7A55]',
  Redeemed: 'bg-[#E6F7F0] text-[#0B7A55]',
};

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export default function Index({ gifts }: any) {
  const items = gifts?.data || [];

  return (
    <AppLayout>
      <Head title="Your gifts" />

      <div className="space-y-8 pb-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-ink md:text-4xl">Your gifts</h1>
            <p className="mt-1 text-sm text-ink-soft">See when each gift is opened, and read their replies.</p>
          </div>
          <Link href="/create" className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-primary px-5 text-sm font-extrabold text-white shadow-glow">
            <Plus className="size-4" aria-hidden /> Send a gift
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="mx-auto max-w-md rounded-[1.75rem] border border-line bg-gradient-blush p-10 text-center">
            <Icon3D name="gift" size="xl" className="mx-auto" />
            <h2 className="mt-4 font-display text-xl font-extrabold text-ink">No gifts sent yet</h2>
            <p className="mt-1 text-sm text-ink-soft">When you send a mystery gift, you'll see here when it's opened and what they said back.</p>
            <Link href="/create" className="mt-6 inline-flex h-12 items-center rounded-full bg-gradient-primary px-6 font-extrabold text-white shadow-glow">
              Send your first gift
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {items.map((g: any) => (
              <li key={g.id} className="rounded-[1.5rem] border border-line bg-white p-5 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-petal">
                      <Icon3D name="gift" size="sm" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-sans text-base font-extrabold text-ink">{g.recipient_name}</h3>
                      <p className="text-xs text-ink-soft">{g.occasion} · {g.delivery}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONE[g.status] ?? 'bg-muted text-ink-soft'}`}>
                    {g.status}
                  </span>
                </div>

                <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
                  <span className="text-xs text-ink-soft">{g.item ? 'Gift' : 'Amount'}</span>
                  <span className="font-display text-lg font-extrabold text-ink">{g.item || money(Number(g.amount), g.currency)}</span>
                </div>

                {g.sender_hint && (
                  <p className="mt-3 text-xs text-ink-soft">
                    <span className="font-bold text-ink">Their hint: </span>{g.sender_hint}
                  </p>
                )}

                {(g.reply_text || g.reply_media_path) && (
                  <div className="mt-4 rounded-2xl bg-petal p-4">
                    <p className="flex items-center gap-1.5 text-xs font-extrabold text-magenta-deep">
                      <MessageCircleHeart className="size-4" aria-hidden /> {g.recipient_name.split(' ')[0]} replied
                    </p>
                    {g.reply_text && <p className="mt-1.5 whitespace-pre-line text-sm text-ink">{g.reply_text}</p>}
                    {g.reply_media_path && <audio src={`/storage/${g.reply_media_path}`} controls className="mt-2 w-full" />}
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <a href={`/gift/${g.token}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-magenta-deep hover:underline">
                    Open their gift link <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
