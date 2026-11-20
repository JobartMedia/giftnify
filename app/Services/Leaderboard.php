<?php

namespace App\Services;

use App\Models\CmsCurrency;
use App\Models\Gift;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Birthday leaderboard: who got the most love on their birthday this month.
 *
 * A gift counts for a celebrant when it is paid, it is theirs (claimed into
 * their wallet, sent to their gift link, or sent to their email or phone), and
 * it lands during their birthday week (3 days before to 3 days after).
 *
 * Points: 10 per gift, plus a value bonus of 1 point per ₦1,000 (or the same
 * value in another currency), capped at 40 per gift. Only the first 3 gifts
 * from any one sender count, so nobody can buy someone to the top with a pile
 * of tiny gifts. Amounts are never returned, only gifts, gifters and points.
 */
class Leaderboard
{
    public const WINDOW_DAYS = 3;
    public const PER_GIFT = 10;
    public const BONUS_CAP = 40;
    public const NGN_PER_POINT = 1000;
    public const MAX_PER_SENDER = 3;
    public const TZ = 'Africa/Lagos';
    private const PAID = ['Awaiting Payment', 'Cancelled', 'Refunded'];

    public static function today(): CarbonImmutable
    {
        return CarbonImmutable::now(self::TZ);
    }

    /**
     * Everyone with a birthday in this month, scored and ranked.
     * $year = null means all time (every year's birthday week added up).
     * $day limits it to people born on that day ("Today's birthdays").
     *
     * @return Collection<int, array{user: User, points: int, gifts: int, gifters: int}>
     */
    public static function scores(int $month, ?int $year, ?int $day = null): Collection
    {
        $key = "leaderboard:{$month}:" . ($year ?? 'all') . ':' . ($day ?? 'all');
        $ids = Cache::remember($key, now()->addMinutes(10), fn () => self::compute($month, $year, $day)
            ->map(fn ($r) => [$r['user']->id, $r['points'], $r['gifts'], $r['gifters']])->all());

        $users = User::whereIn('id', array_column($ids, 0))->get()->keyBy('id');
        return collect($ids)->filter(fn ($r) => isset($users[$r[0]]))
            ->map(fn ($r) => ['user' => $users[$r[0]], 'points' => $r[1], 'gifts' => $r[2], 'gifters' => $r[3]])
            ->values();
    }

    public static function forget(int $month): void
    {
        $now = self::today();
        foreach ([$now->year, $now->year - 1, null] as $y) {
            Cache::forget("leaderboard:{$month}:" . ($y ?? 'all') . ':all');
            for ($d = 1; $d <= 31; $d++) Cache::forget("leaderboard:{$month}:" . ($y ?? 'all') . ":{$d}");
        }
    }

    private static function compute(int $month, ?int $year, ?int $day): Collection
    {
        $people = User::where('birth_month', $month)
            ->when($day, fn ($q) => $q->where('birth_day', $day))
            ->where(fn ($q) => $q->whereNull('status')->orWhere('status', 'active'))
            ->get();
        if ($people->isEmpty()) return collect();

        // Which account each gift belongs to.
        $byContact = [];
        foreach ($people as $u) {
            if ($u->email) $byContact[strtolower(trim($u->email))] = $u->id;
            if ($u->phone) $byContact[DeliveryService::normalizePhone($u->phone)] = $u->id;
        }
        if ($year) {
            $years = [$year];
        } else {
            $first = Gift::min('created_at');
            $years = range($first ? CarbonImmutable::parse($first)->year : self::today()->year, self::today()->year);
        }

        $rates = CmsCurrency::pluck('per_usd', 'code')->map(fn ($r) => (float)$r)->all();
        $ngnPerUsd = $rates['NGN'] ?? 1500.0;
        $totals = [];

        foreach ($years as $y) {
            $from = CarbonImmutable::create($y, $month, 1, 0, 0, 0, self::TZ)->subDays(self::WINDOW_DAYS);
            $to = CarbonImmutable::create($y, $month, 1, 0, 0, 0, self::TZ)->endOfMonth()->addDays(self::WINDOW_DAYS);

            $gifts = Gift::whereNotIn('status', self::PAID)
                ->where(function ($q) use ($people, $byContact) {
                    $q->whereIn('recipient_user_id', $people->pluck('id'))
                      ->orWhereIn(\DB::raw('lower(recipient_contact)'), array_keys($byContact));
                })
                ->where(function ($q) use ($from, $to) {
                    $q->whereBetween('unlock_at', [$from->utc(), $to->utc()])
                      ->orWhere(fn ($q) => $q->whereNull('unlock_at')->whereBetween('created_at', [$from->utc(), $to->utc()]));
                })
                ->get(['id', 'sender_id', 'sender_name', 'recipient_user_id', 'recipient_contact', 'currency', 'amount', 'unlock_at', 'created_at']);

            $perSender = [];
            foreach ($people as $u) {
                $birthday = self::birthdayIn($u, $y);
                if (!$birthday) continue;
                $start = $birthday->subDays(self::WINDOW_DAYS)->startOfDay();
                $end = $birthday->addDays(self::WINDOW_DAYS)->endOfDay();

                foreach ($gifts as $g) {
                    $owner = $g->recipient_user_id ?: ($byContact[strtolower(trim((string)$g->recipient_contact))]
                        ?? $byContact[DeliveryService::normalizePhone((string)$g->recipient_contact)] ?? null);
                    if ($owner !== $u->id || $g->sender_id === $u->id) continue;

                    $at = CarbonImmutable::parse($g->unlock_at ?? $g->created_at)->setTimezone(self::TZ);
                    if ($at->lt($start) || $at->gt($end)) continue;

                    $sender = $g->sender_id ? 'u' . $g->sender_id : 'n' . strtolower(trim((string)$g->sender_name));
                    $k = "{$u->id}|{$y}|{$sender}";
                    $perSender[$k] = ($perSender[$k] ?? 0) + 1;
                    if ($perSender[$k] > self::MAX_PER_SENDER) continue;

                    $ngn = (float)$g->amount / max(0.000001, $rates[$g->currency] ?? $ngnPerUsd) * $ngnPerUsd;
                    $t = &$totals[$u->id];
                    $t['points'] = ($t['points'] ?? 0) + self::PER_GIFT + min(self::BONUS_CAP, (int)floor($ngn / self::NGN_PER_POINT));
                    $t['gifts'] = ($t['gifts'] ?? 0) + 1;
                    $t['senders'][$sender] = true;
                    unset($t);
                }
            }
        }

        return $people->map(fn (User $u) => [
            'user' => $u,
            'points' => $totals[$u->id]['points'] ?? 0,
            'gifts' => $totals[$u->id]['gifts'] ?? 0,
            'gifters' => count($totals[$u->id]['senders'] ?? []),
        ])->sort(fn ($a, $b) => [$b['points'], $b['gifts'], $a['user']->id] <=> [$a['points'], $a['gifts'], $b['user']->id])
          ->values();
    }

    /** Their birthday in a given year (29 Feb falls on 28 Feb in other years). */
    public static function birthdayIn(User $u, int $year): ?CarbonImmutable
    {
        if (!$u->birth_month || !$u->birth_day) return null;
        $day = min($u->birth_day, CarbonImmutable::create($year, $u->birth_month, 1, 0, 0, 0, self::TZ)->daysInMonth);
        return CarbonImmutable::create($year, $u->birth_month, $day, 12, 0, 0, self::TZ);
    }

    /** Public entry: never the email, phone or any amount. */
    public static function entry(array $r, int $rank): array
    {
        $u = $r['user'];
        return [
            'rank' => $rank,
            'name' => $u->name,
            'first' => explode(' ', trim($u->name))[0],
            'avatar_url' => $u->avatar_url,
            'city' => $u->city,
            'country' => $u->country,
            'birthday' => $u->birth_day ? CarbonImmutable::create(2000, $u->birth_month, $u->birth_day)->format('j M') : null,
            'points' => $r['points'],
            'gifts' => $r['gifts'],
            'gifters' => $r['gifters'],
            'link' => $u->username && $u->creator_enabled ? url('/@' . $u->username) : null,
            'username' => $u->username && $u->creator_enabled ? $u->username : null,
        ];
    }

    /** The public board: people who chose to be shown and have at least one gift. */
    public static function board(int $month, ?int $year, ?int $day, int $limit): array
    {
        $rows = self::scores($month, $year, $day)
            ->filter(fn ($r) => $r['user']->leaderboard_opt_in && $r['points'] > 0)->values();
        return [
            'total' => $rows->count(),
            'entries' => $rows->take($limit)->map(fn ($r, $i) => self::entry($r, $i + 1))->values()->all(),
        ];
    }

    /**
     * Where a signed-in person stands this month, among everyone shown on the
     * board, with the next target and the person just above them.
     */
    public static function rankFor(User $user, ?int $year = null): ?array
    {
        if (!$user->birth_month || !$user->birth_day) return null;
        $year ??= self::today()->year;

        $all = self::scores($user->birth_month, $year);
        $mine = $all->firstWhere(fn ($r) => $r['user']->id === $user->id)
            ?? ['user' => $user, 'points' => 0, 'gifts' => 0, 'gifters' => 0];
        $field = $all->filter(fn ($r) => ($r['user']->leaderboard_opt_in && $r['points'] > 0) || $r['user']->id === $user->id)->values();
        $index = $field->search(fn ($r) => $r['user']->id === $user->id);
        $rank = $index === false ? $field->count() + 1 : $index + 1;

        $target = null;
        foreach ([3, 10, 30, 100] as $top) {
            if ($rank > $top && $field->count() >= $top) {
                $needed = max(1, $field[$top - 1]['points'] - $mine['points'] + 1);
                $target = ['top' => $top, 'gifts' => (int)ceil($needed / self::PER_GIFT)];
                break;
            }
        }
        $above = $rank > 1 && isset($field[$rank - 2]) ? $field[$rank - 2] : null;

        $birthday = self::birthdayIn($user, $year);
        $today = self::today()->startOfDay();
        $phase = $today->lt($birthday->startOfDay()->subDays(self::WINDOW_DAYS)) ? 'upcoming'
            : ($today->gt($birthday->endOfDay()->addDays(self::WINDOW_DAYS)) ? 'past' : 'live');

        return self::entry($mine, $rank) + [
            'total' => max($field->count(), $rank),
            'month' => $user->birth_month,
            'month_name' => CarbonImmutable::create(2000, $user->birth_month, 1)->format('F'),
            'year' => $year,
            'phase' => $phase,
            'days_to_birthday' => $phase === 'upcoming' ? (int)$today->diffInDays($birthday->startOfDay()) : 0,
            'shown' => (bool)$user->leaderboard_opt_in,
            'target' => $target,
            'above' => $above ? ['name' => explode(' ', trim($above['user']->name))[0], 'rank' => $rank - 1,
                'gifts_ahead' => (int)ceil(max(1, $above['points'] - $mine['points'] + 1) / self::PER_GIFT)] : null,
            'birth_day' => $user->birth_day,
            'own_link' => $user->username && $user->creator_enabled ? url('/@' . $user->username) : null,
        ];
    }
}
