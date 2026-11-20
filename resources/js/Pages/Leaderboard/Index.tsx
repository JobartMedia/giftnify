import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AppLayout } from '../../Layouts/AppLayout';
import { LeaderboardView, type BoardData, type BoardFilters, type BirthdayInput } from '../../Components/leaderboard/LeaderboardView';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content || '';

export default function LeaderboardPage(props: BoardData) {
  const [loading, setLoading] = useState(false);

  const onFilter = (f: BoardFilters) => {
    const q: Record<string, string> = { limit: String(f.limit) };
    if (f.today) q.today = '1'; else { q.month = String(f.month); q.year = String(f.year); }
    router.get('/leaderboard', q, { preserveState: true, preserveScroll: true, replace: true, only: ['filters', 'title', 'board'],
      onStart: () => setLoading(true), onFinish: () => setLoading(false) });
  };

  const saveBirthday = async (input: BirthdayInput) => {
    const res = await fetch('/leaderboard/birthday', {
      method: 'POST', credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
      body: JSON.stringify(input),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: d.message || 'That did not save. Try again.' };
    router.reload({ only: ['board', 'me', 'birthday_locked', 'profile'] });
    return { ok: true, me: d.me };
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return (
    <AppLayout>
      <Head title="Birthday Leaderboard — Giftnify">
        <meta name="description" content="Who got the most love on their birthday this month? See the Giftnify Birthday Leaderboard." />
        <meta property="og:title" content={`Most Gifted · ${props.title} 🎉`} />
      </Head>
      <LeaderboardView
        data={props}
        loading={loading}
        onFilter={onFilter}
        saveBirthday={saveBirthday}
        signInHref={`/login?redirect=${encodeURIComponent('/leaderboard')}`}
        registerHref="/register"
        giftLinkHref="/creator"
        boardUrl={`${origin}/leaderboard`}
        sendHref={(e) => (e.username ? `/@${e.username}` : null)}
      />
    </AppLayout>
  );
}
