<?php

namespace App\Http\Controllers;

use App\Jobs\DeliverGift;
use App\Models\CmsSetting;
use App\Models\Gift;
use App\Models\Payment;
use App\Models\PromoCode;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function checkout(Request $request, string $token): Response
    {
        $gift = $this->ownedGift($request, $token);
        $quote = $this->quoteFor($gift, null);

        return Inertia::render('Gift/Checkout', [
            'gift' => [
                'token' => $gift->token,
                'recipient_name' => $gift->recipient_name,
                'occasion' => $gift->occasion,
                'delivery' => $gift->delivery,
                'currency' => $gift->currency,
                'item' => $gift->item,
                'status' => $gift->status,
            ],
            'quote' => $quote,
            'provider' => PaymentService::providerFor($gift->currency),
        ]);
    }

    /** Server-side price with an optional promo code. The browser never decides the total. */
    public function quote(Request $request, string $token): JsonResponse
    {
        $validated = $request->validate(['promo_code' => 'nullable|string|max:40']);
        $key = "promo:{$request->user()->id}";
        if (RateLimiter::tooManyAttempts($key, 10)) {
            return response()->json(['message' => 'Too many attempts. Wait a minute, then try again.'], 429);
        }
        RateLimiter::hit($key, 60);

        $gift = $this->ownedGift($request, $token);
        return response()->json($this->quoteFor($gift, $validated['promo_code'] ?? null));
    }

    public function start(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string|min:6|max:64',
            'promo_code' => 'nullable|string|max:40',
        ]);

        $r = $this->begin($request, $validated['token'], $validated['promo_code'] ?? null, null);

        return match ($r['status']) {
            'paid' => redirect()->route('gifts.success', ['token' => $r['token']]),
            'redirect' => Inertia::location($r['redirect_url']),
            'already_paid' => redirect()->route('gifts.index')->with('info', $r['message']),
            default => back()->with('error', $r['message']),
        };
    }

    /** App (API) checkout: same rules as the website, answered as JSON. */
    public function apiStart(Request $request, string $token): JsonResponse
    {
        $validated = $request->validate([
            'promo_code' => 'nullable|string|max:40',
            'return_to' => 'nullable|url|max:300',
        ]);

        $r = $this->begin($request, $token, $validated['promo_code'] ?? null, $validated['return_to'] ?? null);
        $code = in_array($r['status'], ['paid', 'redirect', 'already_paid'], true) ? 200 : 422;
        return response()->json($r, $code);
    }

    /** App (API): confirm a payment after the provider sends the sender back. */
    public function apiStatus(Request $request, string $reference): JsonResponse
    {
        $payment = Payment::where('reference', $reference)->where('user_id', $request->user()->id)->firstOrFail();
        $result = PaymentService::finalizePayment($reference);
        $this->afterPaid($result);

        return response()->json([
            'status' => $result['status'],
            'token' => $payment->gift_token,
            'share_link' => route('reveal.show', ['token' => $payment->gift_token]),
        ]);
    }

    /**
     * Shared checkout start for the website and the app.
     * @return array{status: string, message?: string, token?: string, reference?: string, redirect_url?: string}
     */
    private function begin(Request $request, string $token, ?string $promoCode, ?string $returnTo): array
    {
        $user = $request->user();
        if (RateLimiter::tooManyAttempts("pay:{$user->id}", 10)) {
            return ['status' => 'error', 'message' => 'Too many payment attempts. Wait a minute, then try again.'];
        }
        RateLimiter::hit("pay:{$user->id}", 60);

        $gift = $this->ownedGift($request, $token);

        // A gift started as a guest belongs to whoever signs in and pays for it.
        if (!$gift->sender_id) {
            $gift->update([
                'sender_id' => $user->id,
                'sender_name' => $user->name ?: explode('@', $user->email)[0],
            ]);
        }
        if ($gift->status !== 'Awaiting Payment') {
            return ['status' => 'already_paid', 'token' => $gift->token, 'message' => 'This gift has already been paid.'];
        }

        $provider = PaymentService::providerFor($gift->currency);
        if (!$provider) {
            return ['status' => 'error', 'message' => "Payments in {$gift->currency} aren't available yet. Create the gift in another currency."];
        }

        $quote = $this->quoteFor($gift, $promoCode);
        $promo = $quote['promo_applied'] ? PromoCode::where('code', $quote['promo_code'])->first() : null;
        $reference = 'gn_' . $gift->token . '_' . base_convert((string)time(), 10, 36);

        DB::transaction(function () use ($reference, $gift, $user, $provider, $quote, $promo) {
            Payment::create([
                'reference' => $reference,
                'gift_token' => $gift->token,
                'user_id' => $user->id,
                'provider' => $provider,
                'amount' => $quote['amount'],
                'fee' => $quote['fee'],
                'discount' => $quote['discount'],
                'promo_code' => $promo?->code,
                'currency' => $gift->currency,
                'status' => 'pending',
            ]);

            if ($promo) {
                $q = PromoCode::where('code', $promo->code);
                if ($promo->max_uses !== null) {
                    $q->where('uses', '<', $promo->max_uses);
                }
                $q->increment('uses');
            }
        });

        // Paying from the app: send the sender back to the app afterwards (only to an allowed app address).
        if ($returnTo && self::allowedReturn($returnTo)) {
            Cache::put("payment-return:{$reference}", rtrim($returnTo, '/'), now()->addDay());
        }

        if ($provider === 'demo') {
            $result = PaymentService::finalizePayment($reference);
            $this->afterPaid($result);
            return ['status' => 'paid', 'token' => $gift->token, 'reference' => $reference];
        }

        try {
            $checkout = PaymentService::startCheckout($provider, [
                'reference' => $reference,
                'amount' => $quote['total'],
                'currency' => $gift->currency,
                'email' => $user->email,
                'return_url' => route('payments.callback', ['reference' => $reference]),
                'description' => $gift->item ? "Gift: {$gift->item}" : "Gift for {$gift->recipient_name}",
            ]);
        } catch (\Throwable $e) {
            Log::error('Checkout start failed', ['provider' => $provider, 'error' => $e->getMessage()]);
            Payment::where('reference', $reference)->update(['status' => 'failed']);
            return ['status' => 'error', 'message' => "We couldn't reach the payment provider. Nothing was charged. Try again in a minute."];
        }

        if (!empty($checkout['provider_ref'])) {
            Payment::where('reference', $reference)->update(['provider_ref' => $checkout['provider_ref']]);
        }

        return ['status' => 'redirect', 'token' => $gift->token, 'reference' => $reference, 'redirect_url' => $checkout['redirect_url']];
    }

    /** Only the app addresses listed in APP_CLIENT_URLS may receive payment redirects. */
    public static function allowedReturn(string $url): bool
    {
        $origin = parse_url($url, PHP_URL_SCHEME) . '://' . parse_url($url, PHP_URL_HOST) . (parse_url($url, PHP_URL_PORT) ? ':' . parse_url($url, PHP_URL_PORT) : '');
        return in_array($origin, (array)config('services.app_clients', []), true);
    }

    public function callback(Request $request, string $reference)
    {
        $payment = Payment::where('reference', $reference)->firstOrFail();
        $result = PaymentService::finalizePayment($reference);
        $this->afterPaid($result);

        // Started in the app? Hand the sender back to the app's payment page.
        if ($app = Cache::get("payment-return:{$reference}")) {
            return redirect()->away("{$app}/payment/{$reference}");
        }

        if ($result['status'] === 'paid') {
            return redirect()->route('gifts.success', ['token' => $payment->gift_token]);
        }

        $message = $result['status'] === 'pending'
            ? "Your payment hasn't been confirmed yet. If you were charged, it will confirm within a few minutes."
            : 'The payment did not go through. Nothing was charged. Try again.';

        return redirect()->route('gifts.checkout', ['token' => $payment->gift_token])->with('error', $message);
    }

    public function success(Request $request, string $token): Response
    {
        $gift = $this->ownedGift($request, $token);

        return Inertia::render('Gift/Success', [
            'gift' => $gift->only(['token', 'recipient_name', 'occasion', 'delivery', 'currency', 'amount', 'item', 'status', 'recipient_contact']),
            'share_link' => route('reveal.show', ['token' => $token]),
        ]);
    }

    public function webhook(Request $request, string $provider)
    {
        if (!in_array($provider, PaymentService::PROVIDERS, true) || $provider === 'demo') {
            return response('Unknown provider', 404);
        }

        $reference = PaymentService::readWebhook($provider, $request->headers->all(), $request->getContent());
        if (!$reference) {
            return response('Invalid signature', 401);
        }

        $this->afterPaid(PaymentService::finalizePayment($reference));
        return response('ok', 200);
    }

    /* ------------------------------------------------------------------ */

    /** Sends the gift once, the first time a payment is confirmed. */
    private function afterPaid(array $result): void
    {
        if (($result['status'] ?? null) === 'paid' && !empty($result['newly_paid']) && !empty($result['gift_token'])) {
            DeliverGift::dispatch($result['gift_token']);
        }
    }

    private function ownedGift(Request $request, string $token): Gift
    {
        $gift = Gift::where('token', $token)->firstOrFail();
        if ($gift->sender_id && $gift->sender_id !== $request->user()?->id) {
            abort(403);
        }
        return $gift;
    }

    private function quoteFor(Gift $gift, ?string $code): array
    {
        $feeRate = (float)(CmsSetting::get('service_fee_rate', 0.02) ?? 0.02);
        $amount = round((float)$gift->amount, 2);
        $fee = round($amount * $feeRate, 2);
        $discount = 0.0;
        $applied = false;
        $message = null;
        $normalized = $code ? strtoupper(trim($code)) : null;

        if ($normalized) {
            $promo = PromoCode::where('code', $normalized)->first();
            if ($promo && $promo->isValid()) {
                $discount = round(($amount + $fee) * ($promo->percent_off / 100), 2);
                $applied = true;
                $message = "{$promo->percent_off}% off applied.";
            } else {
                $message = "That code isn't valid or has expired.";
            }
        }

        return [
            'amount' => $amount,
            'fee' => $fee,
            'fee_rate' => $feeRate,
            'discount' => $discount,
            'total' => max(0.5, round($amount + $fee - $discount, 2)),
            'currency' => $gift->currency,
            'promo_code' => $applied ? $normalized : null,
            'promo_applied' => $applied,
            'message' => $message,
        ];
    }
}
