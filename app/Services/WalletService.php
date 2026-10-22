<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Gift;
use App\Models\GiftRedemption;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\Withdrawal;
use Illuminate\Support\Facades\DB;

/**
 * All wallet money movement goes through here, inside database transactions
 * with row locks, and every change writes one ledger row. Balances are never
 * edited directly anywhere else.
 */
class WalletService
{
    public const WITHDRAWAL_METHODS = ['Bank Transfer', 'Airtime Top-up', 'Data Bundle', 'Electricity', 'Gift Card'];

    /** Smallest withdrawal per currency (anything not listed uses 1). */
    public const MIN_WITHDRAWAL = ['NGN' => 1000, 'USD' => 5, 'GBP' => 5, 'EUR' => 5, 'CAD' => 5];

    /**
     * Credits a revealed cash gift to the recipient's wallet. Idempotent: calling
     * it twice for the same gift returns the same result without paying twice.
     *
     * @return array{result: string, wallet?: Wallet}
     *   result: credited | already_credited | not_cash | own_gift | not_revealed | already_redeemed | unavailable
     */
    public static function creditGift(User $user, string $token): array
    {
        return DB::transaction(function () use ($user, $token) {
            $gift = Gift::where('token', $token)->lockForUpdate()->first();

            if (!$gift || in_array($gift->status, ['Awaiting Payment', 'Cancelled', 'Refunded'], true)) {
                return ['result' => 'unavailable'];
            }
            if ($gift->recipient_user_id === $user->id && $gift->claimed_at) {
                return ['result' => 'already_credited', 'wallet' => self::walletFor($user, $gift->currency)];
            }
            if ($gift->status === 'Redeemed' || $gift->redeemed_at) {
                return ['result' => 'already_redeemed'];
            }
            if ($gift->sender_id && $gift->sender_id === $user->id) {
                return ['result' => 'own_gift'];
            }
            if ($gift->item) {
                return ['result' => 'not_cash'];
            }
            if (!$gift->revealed_at && $gift->status !== 'Unlocked') {
                return ['result' => 'not_revealed'];
            }
            if ($gift->expires_at && $gift->expires_at->isPast()) {
                return ['result' => 'unavailable'];
            }

            $wallet = self::lockedWallet($user, $gift->currency);
            self::post($wallet, 'credit', 'gift_received', $gift->token, (float)$gift->amount,
                "Gift from {$gift->sender_name}");

            $gift->update([
                'status' => 'Redeemed',
                'redeemed_at' => now(),
                'claimed_at' => now(),
                'recipient_user_id' => $user->id,
            ]);

            GiftRedemption::create([
                'gift_token' => $gift->token,
                'method' => 'Giftnify Wallet',
                'details' => ['user_id' => $user->id],
                'payout_status' => 'completed',
                'processed_at' => now(),
            ]);

            return ['result' => 'credited', 'wallet' => $wallet->fresh()];
        });
    }

    /**
     * Moves money out of the wallet into a pending withdrawal. The debit and the
     * request are created together, so the balance can never go negative.
     *
     * @return array{result: string, withdrawal?: Withdrawal}
     *   result: ok | insufficient | below_minimum | no_wallet
     */
    public static function requestWithdrawal(User $user, string $currency, float $amount, string $method, array $details): array
    {
        $amount = round($amount, 2);
        $min = self::MIN_WITHDRAWAL[$currency] ?? 1;
        if ($amount < $min) {
            return ['result' => 'below_minimum', 'minimum' => $min];
        }

        return DB::transaction(function () use ($user, $currency, $amount, $method, $details) {
            $wallet = Wallet::where('user_id', $user->id)->where('currency', $currency)->lockForUpdate()->first();
            if (!$wallet) return ['result' => 'no_wallet'];
            if ((float)$wallet->balance < $amount) return ['result' => 'insufficient'];

            $withdrawal = Withdrawal::create([
                'user_id' => $user->id,
                'wallet_id' => $wallet->id,
                'amount' => $amount,
                'currency' => $currency,
                'method' => $method,
                'details' => $details,
                'status' => 'pending',
            ]);

            self::post($wallet, 'debit', 'withdrawal', $withdrawal->id, $amount, "Withdrawal to {$withdrawal->maskedDestination()}");

            return ['result' => 'ok', 'withdrawal' => $withdrawal];
        });
    }

    /** Staff: mark processing / paid / failed. A failed or cancelled withdrawal is refunded to the wallet once. */
    public static function updateWithdrawal(Withdrawal $w, string $status, User $staff, ?string $reason = null): Withdrawal
    {
        return DB::transaction(function () use ($w, $status, $staff, $reason) {
            $w = Withdrawal::whereKey($w->id)->lockForUpdate()->firstOrFail();
            if (in_array($w->status, ['paid', 'failed', 'cancelled'], true)) {
                return $w; // final states never change
            }

            if (in_array($status, ['failed', 'cancelled'], true)) {
                $wallet = Wallet::whereKey($w->wallet_id)->lockForUpdate()->firstOrFail();
                self::post($wallet, 'credit', 'withdrawal_reversal', $w->id, (float)$w->amount,
                    $status === 'failed' ? 'Withdrawal failed, refunded' : 'Withdrawal cancelled, refunded');
            }

            $w->update([
                'status' => $status,
                'failure_reason' => $reason,
                'processed_by' => $staff->id,
                'processed_at' => in_array($status, ['paid', 'failed', 'cancelled'], true) ? now() : null,
            ]);

            if (class_exists(AuditLog::class)) {
                AuditLog::record('withdrawal.' . $status, $w->id, ['amount' => (string)$w->amount, 'currency' => $w->currency]);
            }

            return $w;
        });
    }

    public static function walletFor(User $user, string $currency): Wallet
    {
        return Wallet::firstOrCreate(['user_id' => $user->id, 'currency' => strtoupper($currency)], ['balance' => 0]);
    }

    /** Wallet summary used by the header and the reveal. */
    public static function balances(User $user): array
    {
        return Wallet::where('user_id', $user->id)->orderByDesc('balance')->get(['currency', 'balance'])
            ->map(fn ($w) => ['currency' => $w->currency, 'balance' => (float)$w->balance])->all();
    }

    private static function lockedWallet(User $user, string $currency): Wallet
    {
        self::walletFor($user, $currency);
        return Wallet::where('user_id', $user->id)->where('currency', strtoupper($currency))->lockForUpdate()->firstOrFail();
    }

    private static function post(Wallet $wallet, string $type, string $source, string $reference, float $amount, string $description): WalletTransaction
    {
        $balance = (float)$wallet->balance + ($type === 'credit' ? $amount : -$amount);
        if ($balance < -0.001) {
            throw new \RuntimeException('Wallet balance cannot go negative.');
        }
        $wallet->update(['balance' => round($balance, 2)]);

        return WalletTransaction::create([
            'wallet_id' => $wallet->id,
            'user_id' => $wallet->user_id,
            'type' => $type,
            'source' => $source,
            'reference' => $reference,
            'amount' => $amount,
            'balance_after' => round($balance, 2),
            'description' => $description,
        ]);
    }
}
