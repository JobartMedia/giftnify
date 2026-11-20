import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/giftnify/ui";
import { LeaderboardView, type BoardData, type BoardFilters } from "@/components/giftnify/leaderboard/LeaderboardView";
import { getLeaderboard, saveBirthday } from "@/lib/leaderboard.functions";
import { API_URL } from "@/lib/api";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Birthday Leaderboard — Giftnify" }, { name: "description", content: "Who got the most love on their birthday this month?" }] }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback((f?: BoardFilters) => {
    setLoading(true);
    getLeaderboard(f).then((d) => { setData(d); setError(false); }).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);
  useEffect(() => load(), [load]);

  return (
    <AppShell wide>
      {!data && !error && (
        <div className="mx-auto max-w-2xl space-y-4" aria-busy="true">
          <div className="h-80 animate-pulse rounded-[2rem] bg-muted" />
          <div className="h-16 animate-pulse rounded-2xl bg-muted" />
          <div className="h-16 animate-pulse rounded-2xl bg-muted" />
        </div>
      )}
      {error && !data && (
        <p role="alert" className="mx-auto max-w-md rounded-2xl bg-muted p-5 text-sm">We couldn't load the leaderboard. Check your connection and that the Giftnify website is running, then reload.</p>
      )}
      {data && (
        <LeaderboardView
          data={data}
          loading={loading}
          onFilter={load}
          saveBirthday={async (input) => {
            const r = await saveBirthday(input);
            if (r.ok) load(data.filters);
            return r;
          }}
          signInHref="/auth?redirect=%2Fleaderboard"
          registerHref="/auth?redirect=%2Fleaderboard"
          giftLinkHref={`${API_URL}/creator`}
          boardUrl={`${API_URL}/leaderboard`}
          sendHref={(e) => (e.username ? `${API_URL}/@${e.username}` : null)}
        />
      )}
    </AppShell>
  );
}
