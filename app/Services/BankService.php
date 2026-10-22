<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/** Nigerian bank list and account-name lookup, through Paystack. */
class BankService
{
    private const FALLBACK = ['Access Bank', 'Fidelity Bank', 'First Bank of Nigeria', 'Guaranty Trust Bank', 'Kuda Bank', 'Moniepoint MFB', 'OPay Digital Services Limited (OPay)', 'United Bank For Africa', 'Wema Bank', 'Zenith Bank'];

    public static function ready(): bool
    {
        return !empty(config('services.payments.paystack_secret_key'));
    }

    /** @return array<string, string> bank name => bank code */
    public static function banks(): array
    {
        if (!self::ready()) {
            return array_fill_keys(self::FALLBACK, '');
        }

        return Cache::remember('paystack-banks-ng', 86400, function () {
            $res = Http::withToken(config('services.payments.paystack_secret_key'))
                ->timeout(15)
                ->get('https://api.paystack.co/bank', ['country' => 'nigeria', 'perPage' => 200]);
            if (!$res->successful()) {
                Log::warning('Paystack bank list failed', ['status' => $res->status()]);
                return array_fill_keys(self::FALLBACK, '');
            }
            $out = [];
            foreach ((array)$res->json('data') as $b) {
                if (!empty($b['active']) && !empty($b['name']) && !empty($b['code'])) {
                    $out[$b['name']] = $b['code'];
                }
            }
            ksort($out);
            return $out ?: array_fill_keys(self::FALLBACK, '');
        });
    }

    public static function names(): array
    {
        return array_keys(self::banks());
    }

    /**
     * Account name for a bank + 10-digit account, or null if not found.
     * Throws when no lookup is possible (no Paystack key on a live site).
     */
    public static function resolve(string $bankName, string $account): ?string
    {
        if (!self::ready()) {
            if (PaymentService::demoAllowed()) {
                return 'TEST ACCOUNT (not verified)';
            }
            throw new \RuntimeException('Bank lookup is not configured.');
        }

        $code = self::banks()[$bankName] ?? null;
        if (!$code) return null;

        $res = Http::withToken(config('services.payments.paystack_secret_key'))
            ->timeout(15)
            ->get('https://api.paystack.co/bank/resolve', ['account_number' => $account, 'bank_code' => $code]);

        return $res->successful() ? ($res->json('data.account_name') ?: null) : null;
    }
}
