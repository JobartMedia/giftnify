<?php

namespace App\Services;

use App\Models\CmsSetting;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;

/**
 * Payment keys entered in the staff console (Admin → Payment settings).
 *
 * Keys are stored encrypted (with APP_KEY) in cms_settings and override the
 * .env values when the app starts. Leave a field empty in the console to fall
 * back to .env. Never sent to the browser: the console only sees the last 4.
 */
class PaymentSettings
{
    public const SETTING = 'payment_keys';

    public const FIELDS = [
        'paystack_secret_key' => ['label' => 'Paystack secret key', 'prefix' => '/^sk_(test|live)_[A-Za-z0-9]{20,}$/', 'secret' => true],
        'paystack_public_key' => ['label' => 'Paystack public key', 'prefix' => '/^pk_(test|live)_[A-Za-z0-9]{20,}$/', 'secret' => false],
        'flutterwave_secret_key' => ['label' => 'Flutterwave secret key', 'prefix' => '/^FLWSECK(_TEST)?-[A-Za-z0-9-]{20,}$/', 'secret' => true],
        'flutterwave_webhook_hash' => ['label' => 'Flutterwave webhook secret hash', 'prefix' => '/^.{8,}$/', 'secret' => true],
    ];

    /** Puts the console's keys into config. Called once at boot; safe before migrations. */
    public static function apply(): void
    {
        try {
            $stored = (array)(CmsSetting::get(self::SETTING, []) ?? []);
        } catch (\Throwable) {
            return; // database not ready yet (first install)
        }
        foreach (self::FIELDS as $key => $_) {
            if (!empty($stored[$key])) {
                try {
                    config(["services.payments.{$key}" => Crypt::decryptString($stored[$key])]);
                } catch (\Throwable) {
                    // APP_KEY changed since the key was saved: ignore, re-enter in the console.
                }
            }
        }
        if (array_key_exists('allow_demo', $stored) && $stored['allow_demo'] === false) {
            config(['services.payments.allow_demo' => false]);
        }
    }

    /** What the console shows: never the key itself. */
    public static function status(): array
    {
        $stored = (array)(CmsSetting::get(self::SETTING, []) ?? []);
        $fields = [];
        foreach (self::FIELDS as $key => $meta) {
            $value = (string)config("services.payments.{$key}");
            $fields[$key] = [
                'label' => $meta['label'],
                'set' => $value !== '',
                'source' => !empty($stored[$key]) ? 'console' : ($value !== '' ? 'env' : null),
                'ending' => $value !== '' ? substr($value, -4) : null,
                'mode' => str_contains($value, '_live_') ? 'live' : (str_contains($value, '_test_') || str_contains($value, '_TEST-') ? 'test' : null),
            ];
        }
        return [
            'fields' => $fields,
            'allow_demo' => PaymentService::demoAllowed(),
            'demo_possible' => app()->environment() !== 'production',
            'routes' => (array)config('services.payments.routes', []),
            'payable' => PaymentService::payableCurrencies(),
            'payout_mode' => PayoutService::mode(),
            'webhooks' => [
                'paystack' => url('/api/public/payments/webhook/paystack'),
                'flutterwave' => url('/api/public/payments/webhook/flutterwave'),
            ],
        ];
    }

    /** Saves non-empty fields; `clear` lists fields to remove. Returns validation errors by field. */
    public static function save(array $input, array $clear = [], ?bool $allowDemo = null): array
    {
        $errors = [];
        $stored = (array)(CmsSetting::get(self::SETTING, []) ?? []);
        foreach (self::FIELDS as $key => $meta) {
            $value = trim((string)($input[$key] ?? ''));
            if (in_array($key, $clear, true)) {
                unset($stored[$key]);
                continue;
            }
            if ($value === '') continue;
            if (!preg_match($meta['prefix'], $value)) {
                $errors[$key] = "That doesn't look like a {$meta['label']}. Copy it again from the dashboard.";
                continue;
            }
            $stored[$key] = Crypt::encryptString($value);
        }
        if ($errors) return $errors;
        if ($allowDemo !== null) $stored['allow_demo'] = $allowDemo;
        CmsSetting::updateOrCreate(['key' => self::SETTING], ['value' => $stored]);
        return [];
    }

    /** Asks Paystack whether the secret key works. */
    public static function checkPaystack(?string $secret = null): array
    {
        $secret = $secret ?: (string)config('services.payments.paystack_secret_key');
        if ($secret === '') return ['ok' => false, 'message' => 'No Paystack secret key is saved yet.'];
        try {
            $res = Http::withToken($secret)->acceptJson()->timeout(12)->get('https://api.paystack.co/bank', ['country' => 'nigeria', 'perPage' => 1]);
        } catch (\Throwable) {
            return ['ok' => false, 'message' => "Couldn't reach Paystack. Check the server's internet connection and try again."];
        }
        if ($res->status() === 401) return ['ok' => false, 'message' => 'Paystack rejected this key. Copy the secret key again from Paystack → Settings → API Keys & Webhooks.'];
        if (!$res->successful()) return ['ok' => false, 'message' => 'Paystack answered with an error (' . $res->status() . '). Try again in a minute.'];
        $mode = str_starts_with($secret, 'sk_live_') ? 'live' : 'test';
        return ['ok' => true, 'message' => $mode === 'live'
            ? 'Connected to Paystack in LIVE mode. Real payments are on.'
            : 'Connected to Paystack in TEST mode. Use Paystack test cards; no real money moves.'];
    }
}
