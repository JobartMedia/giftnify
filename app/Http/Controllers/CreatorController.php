<?php

namespace App\Http\Controllers;

use App\Models\Gift;
use App\Models\User;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "Giftnify me": a creator's public gift link (giftnify.app/@tolu).
 * Fans send mystery gifts to it; the creator opens each one like any gift and
 * the cash lands in their Giftnify wallet. Amounts are never shown in public.
 */
class CreatorController extends Controller
{
    public const RESERVED = ['admin', 'api', 'app', 'giftnify', 'support', 'help', 'login', 'register', 'wallet', 'create', 'gift', 'gifts', 'staff', 'root', 'me'];

    private const DEFAULT_AMOUNTS = [
        'NGN' => [1000, 2000, 5000], 'USD' => [3, 5, 10], 'GBP' => [3, 5, 10], 'EUR' => [3, 5, 10],
        'CAD' => [5, 10, 20], 'GHS' => [20, 50, 100], 'KES' => [200, 500, 1000], 'ZAR' => [50, 100, 200],
    ];

    /** Public page. */
    public function show(string $username): Response
    {
        $creator = User::where('username', strtolower($username))->where('creator_enabled', true)->first();
        if (!$creator) {
            return Inertia::render('Creator/Show', ['creator' => null]);
        }

        $paid = Gift::where('recipient_user_id', $creator->id)
            ->whereNotIn('status', ['Awaiting Payment', 'Cancelled', 'Refunded']);

        $wall = $creator->creator_wall
            ? (clone $paid)->where('on_wall', true)->where('wall_hidden', false)->latest()->limit(12)->get()
                ->map(fn (Gift $g) => [
                    'id' => $g->token,
                    'kind' => $g->reveal_mode === 'guess' ? 'Guess Gift' : 'Mystery Box',
                    'occasion' => $g->occasion,
                    'note' => $g->wall_note,
                    'from' => $g->isAnonymous() ? 'Anonymous' : (explode(' ', (string)$g->sender_name)[0] ?: 'A fan'),
                    'at' => $g->created_at?->toISOString(),
                ])->values()
            : [];

        return Inertia::render('Creator/Show', [
            'creator' => $this->publicProfile($creator) + [
                'gifts_count' => (clone $paid)->count(),
                'wall' => $wall,
            ],
        ]);
    }

    /** The creator's own setup page and the gifts their link has received. */
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $received = Gift::where('recipient_user_id', $user->id)
            ->whereNotIn('status', ['Awaiting Payment', 'Cancelled', 'Refunded'])
            ->latest()->limit(50)->get()
            ->map(fn (Gift $g) => [
                'token' => $g->token,
                'occasion' => $g->occasion,
                'status' => $g->status,
                'opened' => (bool)$g->revealed_at,
                'from' => $g->revealed_at ? $g->revealedName() : 'Unopened mystery',
                'amount' => $g->revealed_at ? (float)$g->amount : null,
                'currency' => $g->currency,
                'note' => $g->wall_note,
                'on_wall' => (bool)$g->on_wall,
                'wall_hidden' => (bool)$g->wall_hidden,
                'link' => route('reveal.show', ['token' => $g->token]),
                'at' => $g->created_at?->toISOString(),
            ]);

        return Inertia::render('Creator/Edit', [
            'profile' => [
                'username' => $user->username,
                'name' => $user->name,
                'bio' => $user->bio,
                'avatar_url' => $user->avatar_url,
                'creator_enabled' => (bool)$user->creator_enabled,
                'currency' => $user->creator_currency ?: ($user->preferred_currency ?: 'NGN'),
                'amounts' => $user->creator_amounts ?: self::DEFAULT_AMOUNTS[$user->creator_currency ?: 'NGN'] ?? [1000, 2000, 5000],
                'wall' => (bool)$user->creator_wall,
                'link' => $user->username ? url('/@' . $user->username) : null,
            ],
            'currencies' => PaymentService::payableCurrencies(),
            'received' => $received,
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();
        $v = $request->validate([
            'username' => ['required', 'string', 'min:3', 'max:30', 'regex:/^[a-zA-Z0-9_]+$/',
                Rule::notIn(self::RESERVED), Rule::unique('users', 'username')->ignore($user->id)],
            'name' => 'required|string|min:2|max:60',
            'bio' => 'nullable|string|max:160',
            'currency' => 'required|string|size:3',
            'amounts' => 'required|array|size:3',
            'amounts.*' => 'required|numeric|min:1|max:10000000',
            'wall' => 'boolean',
            'creator_enabled' => 'boolean',
            'avatar' => 'nullable|image|max:3072',
        ], [
            'username.regex' => 'Use only letters, numbers and underscores.',
            'username.unique' => 'Someone already has that name. Try another.',
            'username.not_in' => 'That name is reserved. Try another.',
        ]);

        $data = [
            'username' => strtolower($v['username']),
            'name' => trim($v['name']),
            'bio' => trim((string)($v['bio'] ?? '')) ?: null,
            'creator_currency' => strtoupper($v['currency']),
            'creator_amounts' => array_map(fn ($a) => round((float)$a, 2), array_values($v['amounts'])),
            'creator_wall' => (bool)($v['wall'] ?? true),
            'creator_enabled' => (bool)($v['creator_enabled'] ?? true),
        ];
        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('avatars', 'public');
            $data['avatar_url'] = Storage::disk('public')->url($path);
        }
        $user->update($data);

        return back()->with('success', 'Your gift link is saved.');
    }

    /** Show or hide one fan's note on the public wall. */
    public function wall(Request $request, string $token)
    {
        $gift = Gift::where('token', $token)->where('recipient_user_id', $request->user()->id)->firstOrFail();
        $gift->update(['wall_hidden' => !$gift->wall_hidden]);
        return back()->with('success', $gift->wall_hidden ? 'Hidden from your page.' : 'Shown on your page.');
    }

    /** Public info for the page and the send-a-gift form. */
    public static function publicProfileFor(User $u): array
    {
        $currency = $u->creator_currency ?: 'NGN';
        return [
            'username' => $u->username,
            'name' => $u->name,
            'bio' => $u->bio,
            'avatar_url' => $u->avatar_url,
            'currency' => $currency,
            'amounts' => $u->creator_amounts ?: (self::DEFAULT_AMOUNTS[$currency] ?? [1000, 2000, 5000]),
            'link' => url('/@' . $u->username),
        ];
    }

    private function publicProfile(User $u): array
    {
        return self::publicProfileFor($u);
    }
}
