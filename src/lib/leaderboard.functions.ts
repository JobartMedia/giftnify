import { api, ApiError } from "./api";
import type { BoardData, BoardFilters, BirthdayInput, MyRank } from "@/components/giftnify/leaderboard/LeaderboardView";

/** Birthday leaderboard, answered by the website's API. Your own rank comes back when signed in. */
export async function getLeaderboard(f?: Partial<BoardFilters>): Promise<BoardData> {
  const q = new URLSearchParams();
  if (f?.limit) q.set("limit", String(f.limit));
  if (f?.today) q.set("today", "1");
  else {
    if (f?.month) q.set("month", String(f.month));
    if (f?.year) q.set("year", String(f.year));
  }
  return api<BoardData>(`/leaderboard${q.size ? `?${q}` : ""}`);
}

/** Set your birthday (once; it locks), city, country and whether you're shown. */
export async function saveBirthday(input: BirthdayInput): Promise<{ ok: boolean; error?: string; me?: MyRank | null }> {
  try {
    const r = await api<{ me: MyRank | null }>("/me/birthday", { body: { ...input } });
    return { ok: true, me: r.me };
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : "That did not save. Try again." };
  }
}
