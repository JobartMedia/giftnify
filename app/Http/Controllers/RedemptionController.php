<?php

namespace App\Http\Controllers;

use App\Models\Gift;
use App\Models\GiftRedemption;
use App\Services\BankService;
use App\Services\RecipientVerification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;

class RedemptionController extends Controller
{
    public function verifyBank(Request $request)
    {
        $validated = $request->validate([
            'bank' => 'required|string|max:120',
            'account' => ['required', 'regex:/^\d{10}$/'],
        ]);

        $key = "bank-check:{$request->ip()}";
        if (RateLimiter::tooManyAttempts($key, 20)) {
            return response()->json(['message' => 'Too many checks. Wait a minute.'], 429);
        }
        RateLimiter::hit($key, 60);

        try {
            $name = BankService::resolve($validated['bank'], $validated['account']);
        } catch (\Throwable $e) {
            return response()->json(['account_name' => null, 'message' => 'Account checks are unavailable right now.'], 503);
        }

        return $name
            ? response()->json(['account_name' => $name])
            : response()->json(['account_name' => null, 'message' => 'No account found. Check the number and bank.'], 422);
    }

    public function redeem(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string|min:6|max:64',
            'method' => 'required|in:Airtime Top-up,Data Bundle,Electricity,Wallet,Gift Card,Bank Transfer',
            'details' => 'required|array',
        ]);

        $ip = $request->ip();
        if (RateLimiter::tooManyAttempts("redeem:{$ip}", 10)) {
            return response()->json(['result' => 'rate_limited'], 429);
        }
        RateLimiter::hit("redeem:{$ip}", 60);

        // Handle demo token
        if (str_starts_with($validated['token'], 'demo-')) {
            return response()->json(['result' => 'ok']);
        }

        // The person must prove they hold the phone/email the gift was sent to.
        $target = Gift::where('token', $validated['token'])->first();
        if ($target && RecipientVerification::required($target, $request)) {
            return response()->json(['result' => 'verify_required'], 403);
        }

        // Bank payouts only to an account name the bank confirmed.
        if ($validated['method'] === 'Bank Transfer') {
            $d = $validated['details'];
            try {
                $confirmed = BankService::resolve((string)($d['bank'] ?? ''), (string)($d['account'] ?? ''));
            } catch (\Throwable $e) {
                return response()->json(['result' => 'bank_unavailable'], 503);
            }
            if (!$confirmed) {
                return response()->json(['result' => 'bank_not_found'], 422);
            }
            $validated['details']['account_name'] = $confirmed;
        }

        // Atomic redemption inside transaction with row locking
        $result = DB::transaction(function () use ($validated) {
            $gift = Gift::where('token', $validated['token'])
                ->lockForUpdate()
                ->first();

            if (!$gift || in_array($gift->status, ['Awaiting Payment', 'Cancelled'])) {
                return 'invalid';
            }

            if ($gift->status === 'Redeemed' || $gift->redeemed_at !== null) {
                return 'already_redeemed';
            }

            if ($gift->status === 'Refunded') {
                return 'refunded';
            }

            if ($gift->expires_at && $gift->expires_at->isPast()) {
                return 'expired';
            }

            // Value is only claimable after the message has played and the sender was revealed.
            if (!$gift->revealed_at && $gift->status !== 'Unlocked') {
                return 'not_revealed';
            }

            $gift->update([
                'status' => 'Redeemed',
                'redeemed_at' => now(),
            ]);

            GiftRedemption::create([
                'gift_token' => $gift->token,
                'method' => $validated['method'],
                'details' => $validated['details'],
                'payout_status' => 'pending',
            ]);

            return 'ok';
        });

        return response()->json(['result' => $result]);
    }
}
