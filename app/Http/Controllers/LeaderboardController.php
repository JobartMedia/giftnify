<?php

namespace App\Http\Controllers;

use App\Services\Leaderboard;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Birthday leaderboard ("Most Gifted in October"). The board is public; your
 * own rank needs you signed in, because only your account knows which gifts
 * are yours. Nobody can look up someone else by name and birthday.
 */
class LeaderboardController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Leaderboard/Index', $this->payload($request));
    }

    /** JSON for the app: GET /api/v1/leaderboard?month=10&year=2026&today=1&limit=10 */
    public function show(Request $request)
    {
        return response()->json($this->payload($request));
    }

    /** Set your birthday once (day and month), city and whether you're shown. */
    public function birthday(Request $request)
    {
        $user = $request->user();
        $locked = (bool)$user->birthday_set_at;

        $v = $request->validate([
            'birth_day' => [$locked ? 'nullable' : 'required', 'integer', 'min:1', 'max:31'],
            'birth_month' => [$locked ? 'nullable' : 'required', 'integer', 'min:1', 'max:12'],
            'city' => 'nullable|string|max:60',
            'country' => 'nullable|string|size:2',
            'shown' => 'boolean',
        ]);

        $data = [
            'country' => isset($v['country']) ? strtoupper($v['country']) : ($user->country ?: 'NG'),
            'leaderboard_opt_in' => (bool)($v['shown'] ?? $user->leaderboard_opt_in ?? true),
        ];
        if ($request->has('city')) $data['city'] = trim((string)$v['city']) ?: null;
        if (!$locked) {
            if (!checkdate((int)$v['birth_month'], (int)$v['birth_day'], 2000)) {
                return $this->fail($request, ['birth_day' => 'That date does not exist.']);
            }
            $data += ['birth_day' => (int)$v['birth_day'], 'birth_month' => (int)$v['birth_month'], 'birthday_set_at' => now()];
        }
        $user->update($data);
        Leaderboard::forget((int)$user->birth_month);

        if ($request->expectsJson() && !$request->header('X-Inertia')) {
            return response()->json(['me' => Leaderboard::rankFor($user->fresh())]);
        }
        return back()->with('success', $locked ? 'Saved.' : 'Birthday saved. Here is where you stand.');
    }

    private function fail(Request $request, array $errors)
    {
        if ($request->expectsJson() && !$request->header('X-Inertia')) {
            return response()->json(['message' => reset($errors), 'errors' => array_map(fn ($e) => [$e], $errors)], 422);
        }
        return back()->withErrors($errors);
    }

    private function payload(Request $request): array
    {
        $today = Leaderboard::today();
        $todayOnly = $request->boolean('today');
        $month = $todayOnly ? $today->month : (int)$request->integer('month', $today->month);
        $month = $month >= 1 && $month <= 12 ? $month : $today->month;
        $yearIn = $request->query('year');
        $year = $yearIn === 'all' ? null : (int)($yearIn ?: $today->year);
        if ($year !== null && ($year < 2024 || $year > $today->year)) $year = $today->year;
        $limit = in_array((int)$request->integer('limit', 100), [10, 100, 500], true) ? (int)$request->integer('limit', 100) : 100;

        $board = Leaderboard::board($month, $year, $todayOnly ? $today->day : null, $limit);
        $user = $request->user();

        return [
            'filters' => [
                'month' => $month,
                'year' => $year ?? 'all',
                'today' => $todayOnly,
                'limit' => $limit,
            ],
            'title' => $todayOnly ? "Today's birthdays" : CarbonImmutable::create(2000, $month, 1)->format('F') . ' ' . ($year ?? '· All time'),
            'today_label' => $today->format('j F'),
            'years' => range($today->year, 2024),
            'board' => $board,
            'signed_in' => (bool)$user,
            'me' => $user ? Leaderboard::rankFor($user) : null,
            'birthday_locked' => $user ? (bool)$user->birthday_set_at : false,
            'profile' => $user ? ['city' => $user->city, 'country' => $user->country ?: 'NG', 'shown' => (bool)$user->leaderboard_opt_in, 'name' => $user->name] : null,
            'rules' => [
                'window_days' => Leaderboard::WINDOW_DAYS,
                'per_gift' => Leaderboard::PER_GIFT,
                'bonus_cap' => Leaderboard::BONUS_CAP,
                'max_per_sender' => Leaderboard::MAX_PER_SENDER,
            ],
        ];
    }
}
