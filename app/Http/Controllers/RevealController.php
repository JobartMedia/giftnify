<?php

namespace App\Http\Controllers;

use App\Models\Gift;
use App\Jobs\NotifySender;
use App\Services\BankService;
use App\Services\RecipientVerification;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Recipient side of a gift.
 *
 * The page load never contains the sender's name or the gift value: both are
 * fetched from reveal() only after the message has been played, so the mystery
 * can't be spoiled by viewing the page source.
 */
class RevealController extends Controller
{
    /** Status order — a gift only ever moves forward. */
    private const PROGRESS = ['Sent' => 1, 'Opened' => 2, 'Message Viewed' => 3, 'Unlocked' => 4, 'Redeemed' => 5];

    private const DEMO = [
        'sender_name' => 'Seun Balogun',
        'recipient_name' => 'You',
        'occasion' => 'Birthday',
        'message_type' => 'text',
        'message_text' => "Happy birthday bro.\nYou deserve the world.\nBuy yourself something great from me.",
        'hint' => 'Someone who has known you since before you were this version of yourself.',
        'currency' => 'USD',
        'amount' => 50.00,
        'item' => null,
    ];

    /** App (API): the sealed gift, same fields as the website reveal page. */
    public function showJson(Request $request, string $token): JsonResponse
    {
        $page = $this->sealed($request, $token);
        $status = isset($page['error']) ? ($page['error'] === 'rate_limited' ? 429 : ($page['error'] === 'expired' ? 410 : 404)) : 200;
        return response()->json($page, $status);
    }

    public function show(Request $request, string $token): Response
    {
        return Inertia::render('Gift/Reveal', $this->sealed($request, $token));
    }

    private function sealed(Request $request, string $token): array
    {
        if ($this->limit($request, 'reveal', 30)) {
            return ['error' => 'rate_limited', 'message' => 'Too many attempts. Please wait a minute and try again.'];
        }

        if ($this->isDemo($token)) {
            return [
                'gift' => [
                    'token' => $token,
                    'is_demo' => true,
                    'recipient_name' => self::DEMO['recipient_name'],
                    'occasion' => self::DEMO['occasion'],
                    'message_type' => self::DEMO['message_type'],
                    'message_text' => self::DEMO['message_text'],
                    'media_url' => null,
                    'hint' => self::DEMO['hint'],
                    'status' => 'Sent',
                    'revealed' => false,
                    'has_reply' => false,
                ],
                'banks' => BankService::names(),
            ];
        }

        [$gift, $error] = $this->findAvailable($token);
        if (!$gift) {
            return $error;
        }

        return [
            'gift' => [
                'token' => $gift->token,
                'is_demo' => false,
                'recipient_name' => $gift->recipient_name,
                'occasion' => $gift->occasion,
                'message_type' => $gift->message_type,
                'message_text' => $gift->message_text,
                'media_url' => $gift->media_path ? Storage::disk('public')->url($gift->media_path) : null,
                'hint' => $gift->sender_hint,
                'status' => $gift->status,
                'revealed' => (bool)$gift->revealed_at || in_array($gift->status, ['Unlocked', 'Redeemed'], true),
                'has_reply' => (bool)$gift->replied_at,
            ],
            'banks' => BankService::names(),
        ];
    }

    public function updateStatus(Request $request, string $token): JsonResponse
    {
        $validated = $request->validate(['status' => 'required|in:Opened,Message Viewed']);
        if ($this->isDemo($token)) return response()->json(['ok' => true]);

        $gift = Gift::where('token', $token)->first();
        if ($gift && $this->progress($validated['status']) > $this->progress($gift->status)) {
            $wasUnopened = $this->progress($gift->status) < $this->progress('Opened');
            $gift->update(['status' => $validated['status']]);
            if ($wasUnopened) NotifySender::dispatch($gift->token, 'opened');
        }

        return response()->json(['ok' => true]);
    }

    /**
     * Called the moment the message ends. Returns who sent it and what it is,
     * and marks the gift as unlocked so the value is held for the recipient.
     */
    public function reveal(Request $request, string $token): JsonResponse
    {
        if ($this->limit($request, 'reveal-open', 20)) {
            return response()->json(['error' => 'rate_limited'], 429);
        }

        if ($this->isDemo($token)) {
            return response()->json($this->revealPayload((object)array_merge(self::DEMO, ['status' => 'Unlocked'])) + [
                'signed_in' => (bool)$request->user(),
                'wallet' => null,
                'verify' => ['required' => false, 'channel' => null, 'destination' => null],
            ]);
        }

        [$gift] = $this->findAvailable($token);
        if (!$gift) return response()->json(['error' => 'not_found'], 404);

        // The message has to have been started before anything is revealed.
        if ($this->progress($gift->status) < $this->progress('Opened')) {
            return response()->json(['error' => 'message_not_played'], 409);
        }

        if ($this->progress($gift->status) < $this->progress('Unlocked')) {
            $gift->status = 'Unlocked';
        }
        $firstReveal = !$gift->revealed_at;
        $gift->revealed_at ??= now();
        $gift->save();
        if ($firstReveal) NotifySender::dispatch($gift->token, 'revealed');

        // Signed in? The cash lands in their wallet on this same request, so the
        // balance updates on the same screen as the name.
        $wallet = null;
        $user = $request->user();
        $verify = RecipientVerification::describe($gift, $request);
        if ($user && !$gift->item && !$verify['required']) {
            $credit = WalletService::creditGift($user, $gift->token);
            if (in_array($credit['result'], ['credited', 'already_credited'], true)) {
                $wallet = [
                    'credited' => true,
                    'balance' => (float)$credit['wallet']->balance,
                    'currency' => $credit['wallet']->currency,
                ];
                $gift->refresh();
            }
        }

        return response()->json($this->revealPayload($gift) + [
            'signed_in' => (bool)$user,
            'wallet' => $wallet,
            'verify' => $verify,
        ]);
    }

    /** The recipient's first reaction: a written note and/or a short voice note. */
    public function reply(Request $request, string $token): JsonResponse
    {
        if ($this->limit($request, 'reveal-reply', 6)) {
            return response()->json(['error' => 'rate_limited'], 429);
        }

        $validated = $request->validate([
            'text' => 'nullable|string|max:1000',
            'voice' => 'nullable|file|mimetypes:audio/webm,audio/ogg,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,video/webm|max:10240',
        ]);
        if (empty(trim($validated['text'] ?? '')) && !$request->hasFile('voice')) {
            return response()->json(['error' => 'empty'], 422);
        }

        if ($this->isDemo($token)) return response()->json(['ok' => true, 'demo' => true]);

        [$gift] = $this->findAvailable($token);
        if (!$gift || !$gift->revealed_at) return response()->json(['error' => 'not_found'], 404);
        if ($gift->replied_at) return response()->json(['error' => 'already_replied'], 409);

        $gift->reply_text = trim($validated['text'] ?? '') ?: null;
        if ($request->hasFile('voice')) {
            $gift->reply_media_path = $request->file('voice')->store('gifts/replies', 'public');
        }
        $gift->replied_at = now();
        $gift->save();
        NotifySender::dispatch($gift->token, 'replied');

        return response()->json(['ok' => true]);
    }

    /** Sends a one-time code to the phone or email the gift was addressed to. */
    public function sendCode(Request $request, string $token): JsonResponse
    {
        [$gift] = $this->findAvailable($token);
        if (!$gift || !$gift->revealed_at) return response()->json(['result' => 'not_found'], 404);

        $result = RecipientVerification::send($gift, $request);
        return response()->json(['result' => $result], $result === 'ok' || $result === 'not_needed' ? 200 : 422);
    }

    public function verifyCode(Request $request, string $token): JsonResponse
    {
        $validated = $request->validate(['code' => 'required|string|size:6']);
        if ($this->limit($request, 'gift-code-verify', 10)) {
            return response()->json(['result' => 'locked'], 429);
        }
        [$gift] = $this->findAvailable($token);
        if (!$gift) return response()->json(['result' => 'not_found'], 404);

        $result = RecipientVerification::verify($gift, $validated['code'], $request);
        return response()->json([
            'result' => $result,
            'ticket' => $result === 'ok' ? RecipientVerification::issueTicket($gift) : null,
        ], $result === 'ok' ? 200 : 422);
    }

    /* ------------------------------------------------------------------ */

    private function revealPayload(object $gift): array
    {
        $name = trim((string)$gift->sender_name) ?: 'A friend';
        return [
            'sender_name' => $name,
            'sender_first' => explode(' ', $name)[0],
            'currency' => $gift->currency,
            'amount' => (float)$gift->amount,
            'item' => $gift->item,
            'status' => $gift->status,
            'redeemed' => $gift->status === 'Redeemed',
        ];
    }

    /** @return array{0: ?Gift, 1: array} */
    private function findAvailable(string $token): array
    {
        $gift = Gift::where('token', $token)->first();

        if (!$gift || in_array($gift->status, ['Awaiting Payment', 'Cancelled', 'Refunded'], true)) {
            return [null, ['error' => 'not_found', 'message' => "This gift couldn't be found or is no longer available. Check the link, or ask the sender to share it again."]];
        }
        if ($gift->expires_at && $gift->expires_at->isPast() && $gift->status !== 'Redeemed') {
            return [null, ['error' => 'expired', 'message' => 'This gift link has expired. Ask the sender to get in touch with Giftnify support.']];
        }
        return [$gift, []];
    }

    private function progress(?string $status): int
    {
        return self::PROGRESS[$status] ?? 0;
    }

    private function isDemo(string $token): bool
    {
        return str_starts_with($token, 'demo-');
    }

    private function limit(Request $request, string $bucket, int $perMinute): bool
    {
        $key = "{$bucket}:{$request->ip()}";
        if (RateLimiter::tooManyAttempts($key, $perMinute)) return true;
        RateLimiter::hit($key, 60);
        return false;
    }
}
