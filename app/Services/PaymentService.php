<?php

namespace App\Services;

use App\Models\Gift;
use App\Models\Payment;
use App\Models\CmsSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymentService
{
    public const PROVIDERS = ['demo', 'paystack', 'flutterwave', 'stripe'];

    protected static function secret(string $key): string
    {
        $val = config("services.payments.{$key}");
        if (empty($val)) {
            throw new \Exception("Payment provider is not configured ({$key} missing)");
        }
        return $val;
    }

    public static function isProviderReady(string $provider): bool
    {
        if ($provider === 'demo') return self::demoAllowed();
        $map = [
            'paystack' => 'paystack_secret_key',
            'flutterwave' => 'flutterwave_secret_key',
            'stripe' => 'stripe_secret_key',
        ];
        return !empty(config('services.payments.' . ($map[$provider] ?? '')));
    }

    /**
     * The provider that collects this currency, or null when nobody can.
     * Demo is used only where demo mode is allowed (never in production).
     */
    public static function providerFor(string $currency): ?string
    {
        $route = config('services.payments.routes.' . strtoupper($currency));
        if ($route && in_array($route, self::PROVIDERS, true) && $route !== 'demo' && self::isProviderReady($route)) {
            return $route;
        }
        return self::demoAllowed() ? 'demo' : null;
    }

    /** Currencies a sender can pay in right now. */
    public static function payableCurrencies(): array
    {
        return array_values(array_filter(
            array_keys((array)config('services.payments.routes', [])),
            fn ($c) => self::providerFor($c) !== null
        ));
    }

    /** Demo mode marks gifts paid without charging anyone, so it is off in production. */
    public static function demoAllowed(): bool
    {
        return (bool)config('services.payments.allow_demo', false);
    }

    public static function startCheckout(string $provider, array $data): array
    {
        $amount = (float)$data['amount'];
        $currency = strtoupper($data['currency']);
        $reference = $data['reference'];
        $email = $data['email'];
        $returnUrl = $data['return_url'];
        $description = $data['description'] ?? 'Giftnify Mystery Gift';

        if ($provider === 'paystack') {
            $secret = self::secret('paystack_secret_key');
            $response = Http::withToken($secret)->post('https://api.paystack.co/transaction/initialize', [
                'email' => $email,
                'amount' => (int)round($amount * 100),
                'currency' => $currency,
                'reference' => $reference,
                'callback_url' => $returnUrl,
            ]);

            if (!$response->successful()) {
                throw new \Exception('Paystack initialization error: ' . $response->body());
            }

            return [
                'redirect_url' => $response->json('data.authorization_url'),
            ];
        }

        if ($provider === 'flutterwave') {
            $secret = self::secret('flutterwave_secret_key');
            $response = Http::withToken($secret)->post('https://api.flutterwave.com/v3/payments', [
                'tx_ref' => $reference,
                'amount' => $amount,
                'currency' => $currency,
                'redirect_url' => $returnUrl,
                'customer' => ['email' => $email],
                'customizations' => [
                    'title' => 'Giftnify',
                    'description' => $description,
                ],
            ]);

            if (!$response->successful()) {
                throw new \Exception('Flutterwave initialization error: ' . $response->body());
            }

            return [
                'redirect_url' => $response->json('data.link'),
            ];
        }

        if ($provider === 'stripe') {
            $secret = self::secret('stripe_secret_key');
            $response = Http::asForm()->withToken($secret)->post('https://api.stripe.com/v1/checkout/sessions', [
                'mode' => 'payment',
                'success_url' => $returnUrl,
                'cancel_url' => $returnUrl,
                'client_reference_id' => $reference,
                'customer_email' => $email,
                'line_items[0][quantity]' => 1,
                'line_items[0][price_data][currency]' => strtolower($currency),
                'line_items[0][price_data][unit_amount]' => (int)round($amount * 100),
                'line_items[0][price_data][product_data][name]' => $description,
                'metadata[reference]' => $reference,
            ]);

            if (!$response->successful()) {
                throw new \Exception('Stripe checkout error: ' . $response->body());
            }

            return [
                'redirect_url' => $response->json('url'),
                'provider_ref' => $response->json('id'),
            ];
        }

        // Demo payment mode
        return [
            'redirect_url' => $returnUrl,
            'provider_ref' => 'demo_' . uniqid(),
        ];
    }

    public static function verifyPayment(string $provider, string $reference, ?string $providerRef = null): array
    {
        if ($provider === 'paystack') {
            $secret = self::secret('paystack_secret_key');
            $response = Http::withToken($secret)->get("https://api.paystack.co/transaction/verify/{$reference}");
            if ($response->successful()) {
                $d = $response->json('data');
                return [
                    'paid' => ($d['status'] ?? '') === 'success',
                    'amount' => ((float)($d['amount'] ?? 0)) / 100,
                    'currency' => $d['currency'] ?? 'USD',
                    'provider_ref' => (string)($d['id'] ?? ''),
                ];
            }
            return ['paid' => false];
        }

        if ($provider === 'flutterwave') {
            $secret = self::secret('flutterwave_secret_key');
            $response = Http::withToken($secret)->get("https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref={$reference}");
            if ($response->successful()) {
                $d = $response->json('data');
                return [
                    'paid' => ($d['status'] ?? '') === 'successful',
                    'amount' => (float)($d['amount'] ?? 0),
                    'currency' => $d['currency'] ?? 'USD',
                    'provider_ref' => (string)($d['id'] ?? ''),
                ];
            }
            return ['paid' => false];
        }

        if ($provider === 'stripe') {
            if (!$providerRef) return ['paid' => false];
            $secret = self::secret('stripe_secret_key');
            $response = Http::withToken($secret)->get("https://api.stripe.com/v1/checkout/sessions/{$providerRef}");
            if ($response->successful()) {
                $d = $response->json();
                return [
                    'paid' => ($d['payment_status'] ?? '') === 'paid' && ($d['client_reference_id'] ?? '') === $reference,
                    'amount' => ((float)($d['amount_total'] ?? 0)) / 100,
                    'currency' => strtoupper($d['currency'] ?? 'USD'),
                    'provider_ref' => $providerRef,
                ];
            }
            return ['paid' => false];
        }

        // Demo payments succeed immediately — only where demo mode is allowed
        if ($provider === 'demo' && self::demoAllowed()) {
            return ['paid' => true, 'provider_ref' => 'demo_' . uniqid()];
        }
        return ['paid' => false];
    }

    /**
     * Timing-safe verification of webhook signatures.
     */
    public static function readWebhook(string $provider, array $headers, string $payload): ?string
    {
        try {
            if ($provider === 'paystack') {
                $signature = $headers['x-paystack-signature'][0] ?? $headers['x-paystack-signature'] ?? '';
                $secret = self::secret('paystack_secret_key');
                $expected = hash_hmac('sha512', $payload, $secret);
                if (!hash_equals($expected, $signature)) {
                    return null;
                }
                $json = json_decode($payload, true);
                return $json['data']['reference'] ?? null;
            }

            if ($provider === 'flutterwave') {
                $hash = $headers['verif-hash'][0] ?? $headers['verif-hash'] ?? '';
                $secret = self::secret('flutterwave_webhook_hash');
                if (!hash_equals($secret, $hash)) {
                    return null;
                }
                $json = json_decode($payload, true);
                return $json['data']['tx_ref'] ?? $json['txRef'] ?? null;
            }

            if ($provider === 'stripe') {
                $sigHeader = $headers['stripe-signature'][0] ?? $headers['stripe-signature'] ?? '';
                $parts = [];
                foreach (explode(',', $sigHeader) as $kv) {
                    $item = explode('=', $kv, 2);
                    if (count($item) === 2) {
                        $parts[trim($item[0])] = trim($item[1]);
                    }
                }
                $t = $parts['t'] ?? null;
                $v1 = $parts['v1'] ?? null;
                if (!$t || !$v1 || abs(time() - (int)$t) > 300) {
                    return null;
                }
                $secret = self::secret('stripe_webhook_secret');
                $signedPayload = "{$t}.{$payload}";
                $expected = hash_hmac('sha256', $signedPayload, $secret);
                if (!hash_equals($expected, $v1)) {
                    return null;
                }
                $json = json_decode($payload, true);
                return $json['data']['object']['client_reference_id'] ?? null;
            }
        } catch (\Throwable $e) {
            Log::error('Webhook signature parsing error: ' . $e->getMessage());
            return null;
        }

        return null;
    }

    /**
     * Idempotently confirms payment and unlocks gift.
     */
    public static function finalizePayment(string $reference): array
    {
        $payment = Payment::where('reference', $reference)->first();
        if (!$payment) {
            return ['status' => 'missing'];
        }

        if ($payment->status === 'paid') {
            return ['status' => 'paid', 'gift_token' => $payment->gift_token];
        }

        $verify = self::verifyPayment($payment->provider, $reference, $payment->provider_ref);
        $totalExpected = (float)$payment->amount + (float)$payment->fee - (float)$payment->discount;

        $isValidAmount = !isset($verify['amount']) || ($verify['amount'] + 0.01 >= $totalExpected);
        $isValidCurrency = !isset($verify['currency']) || (strtoupper($verify['currency']) === strtoupper($payment->currency));

        if (!$verify['paid'] || !$isValidAmount || !$isValidCurrency) {
            return [
                'status' => $verify['paid'] ? 'failed' : 'pending',
                'gift_token' => $payment->gift_token
            ];
        }

        // Atomic: only the first confirmation (callback or webhook) flips the payment and sends the gift.
        $flipped = Payment::where('reference', $reference)->where('status', '!=', 'paid')->update([
            'status' => 'paid',
            'paid_at' => now(),
            'provider_ref' => $verify['provider_ref'] ?? $payment->provider_ref,
        ]);

        Gift::where('token', $payment->gift_token)
            ->where('status', 'Awaiting Payment')
            ->update([
                'status' => 'Sent'
            ]);

        return ['status' => 'paid', 'gift_token' => $payment->gift_token, 'newly_paid' => $flipped === 1];
    }
}
