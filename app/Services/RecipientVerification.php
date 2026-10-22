<?php

namespace App\Services;

use App\Models\Gift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;

/**
 * A gift link is a bearer key: anyone holding it can open it. Before money
 * leaves (wallet credit or payout) we confirm the person also controls the
 * phone or email the sender typed in, with a one-time code.
 */
class RecipientVerification
{
    private const TTL = 600; // 10 minutes
    private const MAX_TRIES = 5;

    public static function required(Gift $gift, Request $request): bool
    {
        if (str_starts_with($gift->token, 'demo-')) return false;
        if ($gift->delivery === 'Link' || !$gift->recipient_contact) return false;
        if ($request->hasSession() && $request->session()->get(self::sessionKey($gift))) return false;
        // The app has no website session: it sends back the ticket it got for the right code.
        $ticket = (string)$request->header('X-Gift-Verification', '');
        if ($ticket !== '' && hash_equals((string)Cache::get("gift-ticket:{$ticket}", ''), $gift->token)) return false;

        $user = $request->user();
        if ($user) {
            $contact = strtolower($gift->recipient_contact);
            if ($gift->delivery === 'Email' && strtolower((string)$user->email) === $contact) return false;
            if ($user->phone && DeliveryService::normalizePhone($user->phone) === $contact) return false;
        }
        return true;
    }

    /** What the reveal page shows: whether a code is needed, and where it goes. */
    public static function describe(Gift $gift, Request $request): array
    {
        $required = self::required($gift, $request);
        return [
            'required' => $required,
            'channel' => $required ? ($gift->delivery === 'Email' ? 'email' : 'phone') : null,
            'destination' => $required ? DeliveryService::mask($gift->recipient_contact) : null,
        ];
    }

    /** @return string ok | rate_limited | unavailable | not_needed */
    public static function send(Gift $gift, Request $request): string
    {
        if (!self::required($gift, $request)) return 'not_needed';

        $key = "gift-code-send:{$gift->token}";
        if (RateLimiter::tooManyAttempts($key, 3)) return 'rate_limited';
        RateLimiter::hit($key, self::TTL);

        $code = (string)random_int(100000, 999999);
        Cache::put(self::cacheKey($gift), ['hash' => hash('sha256', $code . $gift->token), 'tries' => 0], self::TTL);

        try {
            if ($gift->delivery === 'Email') {
                DeliveryService::sendEmail($gift->recipient_contact, "Your Giftnify code: {$code}", 'emails.code', ['code' => $code]);
            } else {
                $channel = $gift->delivery === 'WhatsApp' && config('services.termii.whatsapp_device') ? 'WhatsApp' : 'SMS';
                DeliveryService::sendText($channel, $gift->recipient_contact,
                    "Your Giftnify code is {$code}. It expires in 10 minutes. Don't share it with anyone.");
            }
        } catch (\Throwable $e) {
            report($e);
            return 'unavailable';
        }
        return 'ok';
    }

    /** @return string ok | wrong | expired | locked */
    public static function verify(Gift $gift, string $code, Request $request): string
    {
        $entry = Cache::get(self::cacheKey($gift));
        if (!$entry) return 'expired';
        if ($entry['tries'] >= self::MAX_TRIES) return 'locked';

        if (!hash_equals($entry['hash'], hash('sha256', trim($code) . $gift->token))) {
            $entry['tries']++;
            Cache::put(self::cacheKey($gift), $entry, self::TTL);
            return $entry['tries'] >= self::MAX_TRIES ? 'locked' : 'wrong';
        }

        Cache::forget(self::cacheKey($gift));
        if ($request->hasSession()) {
            $request->session()->put(self::sessionKey($gift), true);
        }
        return 'ok';
    }

    /** A 30-minute proof for the app that the code was confirmed for this gift. */
    public static function issueTicket(Gift $gift): string
    {
        $ticket = bin2hex(random_bytes(24));
        Cache::put("gift-ticket:{$ticket}", $gift->token, now()->addMinutes(30));
        return $ticket;
    }

    private static function cacheKey(Gift $gift): string
    {
        return "gift-code:{$gift->token}";
    }

    private static function sessionKey(Gift $gift): string
    {
        return "gift_verified.{$gift->token}";
    }
}
