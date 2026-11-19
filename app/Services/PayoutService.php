<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\CmsSetting;
use App\Models\User;
use App\Models\Withdrawal;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Wallet withdrawals paid out by Paystack Transfers.
 *
 * Three modes, switched in Admin → Payment settings (pay-by-hand always stays available):
 *   manual  — staff send the money themselves and click Paid / Failed (default)
 *   approve — staff click "Send with Paystack" on each request
 *   auto    — Naira bank withdrawals are sent the moment the customer asks
 *
 * Only Naira bank transfers can go through Paystack. Airtime, data, electricity
 * and gift cards are always paid by hand. Paystack confirms the result by webhook
 * (transfer.success / transfer.failed / transfer.reversed) or by "Check status".
 * A failed or reversed transfer refunds the customer's wallet automatically.
 */
class PayoutService
{
    public const SETTING = 'payout_mode';
    public const MODES = ['manual', 'approve', 'auto'];
    public const REFERENCE_PREFIX = 'gnw-';

    public static function mode(): string
    {
        try {
            $m = CmsSetting::get(self::SETTING, 'manual');
        } catch (\Throwable) {
            return 'manual';
        }
        return in_array($m, self::MODES, true) ? $m : 'manual';
    }

    public static function setMode(string $mode): void
    {
        CmsSetting::updateOrCreate(['key' => self::SETTING], ['value' => in_array($mode, self::MODES, true) ? $mode : 'manual']);
    }

    public static function ready(): bool
    {
        return !empty(config('services.payments.paystack_secret_key'));
    }

    /** Can this request be paid by Paystack at all? */
    public static function eligible(Withdrawal $w): bool
    {
        return $w->method === 'Bank Transfer' && strtoupper($w->currency) === 'NGN';
    }

    /** Called right after a customer asks to withdraw. Sends it straight away in auto mode. */
    public static function afterRequested(Withdrawal $w): void
    {
        if (self::mode() !== 'auto' || !self::ready() || !self::eligible($w)) return;
        $r = self::send($w, null);
        if (!$r['ok']) {
            Log::warning('Automatic payout not sent; left for staff', ['withdrawal' => $w->id, 'reason' => $r['message']]);
        }
    }

    /**
     * Sends one withdrawal with Paystack. Safe to call twice: a request that was
     * already sent is never sent again (one reference per withdrawal).
     *
     * @return array{ok: bool, message: string}
     */
    public static function send(Withdrawal $w, ?User $staff): array
    {
        if (!self::ready()) return ['ok' => false, 'message' => 'Add your Paystack secret key in Payment settings first.'];
        if (!self::eligible($w)) return ['ok' => false, 'message' => 'Only Naira bank withdrawals can be sent with Paystack. Pay this one by hand.'];

        // Claim the request so two clicks (or auto + staff) can never send it twice.
        $reference = self::REFERENCE_PREFIX . $w->id;
        $claimed = DB::transaction(function () use ($w, $reference) {
            $row = Withdrawal::whereKey($w->id)->lockForUpdate()->first();
            if (!$row || $row->status !== 'pending' || $row->transfer_reference) return false;
            $row->update(['status' => 'processing', 'payout_channel' => 'paystack', 'transfer_reference' => $reference]);
            return true;
        });
        if (!$claimed) {
            return ['ok' => false, 'message' => 'This request was already sent or is no longer pending.'];
        }
        $w->refresh();

        $d = (array)$w->details;
        $bankCode = BankService::banks()[$d['bank'] ?? ''] ?? '';
        if ($bankCode === '') {
            return self::undoClaim($w, "Paystack doesn't recognise the bank \"" . ($d['bank'] ?? '') . '". Pay this one by hand.');
        }

        $secret = (string)config('services.payments.paystack_secret_key');
        try {
            $recipient = Http::withToken($secret)->acceptJson()->timeout(20)->post('https://api.paystack.co/transferrecipient', [
                'type' => 'nuban',
                'name' => $d['account_name'] ?? 'Giftnify customer',
                'account_number' => $d['account'] ?? '',
                'bank_code' => $bankCode,
                'currency' => 'NGN',
            ]);
            if (!$recipient->successful() || !$recipient->json('data.recipient_code')) {
                return self::undoClaim($w, 'Paystack could not add this bank account: ' . ($recipient->json('message') ?? 'unknown error'));
            }

            $transfer = Http::withToken($secret)->acceptJson()->timeout(30)->post('https://api.paystack.co/transfer', [
                'source' => 'balance',
                'amount' => (int)round((float)$w->amount * 100), // kobo
                'recipient' => $recipient->json('data.recipient_code'),
                'reference' => $reference,
                'reason' => 'Giftnify wallet withdrawal',
                'currency' => 'NGN',
            ]);
        } catch (\Throwable $e) {
            // We don't know whether Paystack received it: keep it "processing" and let "Check status" settle it.
            Log::error('Paystack transfer request failed', ['withdrawal' => $w->id, 'error' => $e->getMessage()]);
            $w->update(['failure_reason' => "Couldn't reach Paystack. Use Check status before paying again."]);
            return ['ok' => false, 'message' => "Couldn't reach Paystack. The request is marked Processing; use Check status in a minute before doing anything else."];
        }

        $status = (string)$transfer->json('data.status');
        $w->update(['transfer_code' => $transfer->json('data.transfer_code')]);

        if (!$transfer->successful()) {
            $msg = (string)($transfer->json('message') ?? 'unknown error');
            return self::undoClaim($w, 'Paystack refused the transfer: ' . $msg . self::hintFor($msg));
        }
        if ($status === 'otp') {
            return self::undoClaim($w, 'Paystack wants an OTP for each transfer. Turn off "Confirm transfers before sending" (OTP) in Paystack → Settings → Preferences, then try again.');
        }

        AuditLog::record('withdrawal.paystack_sent', $w->id, ['amount' => (string)$w->amount, 'by' => $staff?->email ?? 'automatic']);

        if ($status === 'success') {
            WalletService::updateWithdrawal($w, 'paid', $staff, null, 'paystack');
            return ['ok' => true, 'message' => 'Sent with Paystack and confirmed.'];
        }
        if ($status === 'failed' || $status === 'reversed') {
            WalletService::updateWithdrawal($w, 'failed', $staff, 'Paystack could not complete the transfer. Refunded to wallet.', 'paystack');
            return ['ok' => false, 'message' => 'Paystack could not complete the transfer. The customer was refunded.'];
        }
        // pending / received / processing: Paystack confirms by webhook or Check status.
        return ['ok' => true, 'message' => 'Sent with Paystack. It will show Paid when Paystack confirms.'];
    }

    /** Asks Paystack how a sent withdrawal ended and records it. */
    public static function verify(Withdrawal $w, ?User $staff): array
    {
        if (!$w->transfer_reference) return ['ok' => false, 'message' => 'This request was not sent with Paystack.'];
        try {
            $res = Http::withToken((string)config('services.payments.paystack_secret_key'))->acceptJson()->timeout(20)
                ->get('https://api.paystack.co/transfer/verify/' . urlencode($w->transfer_reference));
        } catch (\Throwable) {
            return ['ok' => false, 'message' => "Couldn't reach Paystack. Try again in a minute."];
        }
        if ($res->status() === 404 || ($res->status() === 400 && !$res->json('data'))) {
            // Paystack never received it: safe to send again.
            $w->update(['status' => 'pending', 'transfer_reference' => null, 'transfer_code' => null, 'payout_channel' => null,
                'failure_reason' => 'Paystack never received this transfer. Send it again or pay by hand.']);
            return ['ok' => true, 'message' => 'Paystack has no record of it, so nothing was sent. It is back to Pending.'];
        }
        return self::applyStatus($w, (string)$res->json('data.status'), $staff);
    }

    /** Paystack webhook: transfer.success / transfer.failed / transfer.reversed. */
    public static function fromWebhook(string $event, array $data): void
    {
        $reference = (string)($data['reference'] ?? '');
        if (!str_starts_with($reference, self::REFERENCE_PREFIX)) return;
        $w = Withdrawal::where('transfer_reference', $reference)->first();
        if (!$w) return;
        $status = match ($event) {
            'transfer.success' => 'success',
            'transfer.failed' => 'failed',
            'transfer.reversed' => 'reversed',
            default => '',
        };
        if ($status !== '') self::applyStatus($w, $status, null);
    }

    private static function applyStatus(Withdrawal $w, string $status, ?User $staff): array
    {
        return match ($status) {
            'success' => (function () use ($w, $staff) {
                WalletService::updateWithdrawal($w, 'paid', $staff, null, 'paystack');
                return ['ok' => true, 'message' => 'Paystack confirmed the transfer. Marked Paid.'];
            })(),
            'failed', 'reversed', 'abandoned', 'rejected' => (function () use ($w, $staff, $status) {
                WalletService::updateWithdrawal($w, 'failed', $staff, "Paystack transfer {$status}. Refunded to wallet.", 'paystack');
                return ['ok' => true, 'message' => "Paystack says the transfer {$status}. The customer was refunded."];
            })(),
            default => ['ok' => true, 'message' => 'Paystack is still processing this transfer (' . ($status ?: 'no status yet') . ').'],
        };
    }

    /** Paystack refused before any money moved: back to Pending for staff, no refund needed. */
    private static function undoClaim(Withdrawal $w, string $reason): array
    {
        $w->update(['status' => 'pending', 'transfer_reference' => null, 'transfer_code' => null, 'payout_channel' => null, 'failure_reason' => $reason]);
        return ['ok' => false, 'message' => $reason];
    }

    private static function hintFor(string $msg): string
    {
        $m = strtolower($msg);
        if (str_contains($m, 'balance')) return ' Top up your Paystack balance, then try again.';
        if (str_contains($m, 'third party payouts') || str_contains($m, 'not enabled') || str_contains($m, 'starter business')) {
            return ' Transfers are not switched on for your Paystack account yet; contact Paystack support to enable them.';
        }
        return '';
    }
}
