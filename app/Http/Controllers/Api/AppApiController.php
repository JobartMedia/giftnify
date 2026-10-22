<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CmsCurrency;
use App\Models\CmsOccasion;
use App\Models\CmsSetting;
use App\Models\Contact;
use App\Models\Gift;
use App\Models\User;
use App\Services\BankService;
use App\Services\DeliveryService;
use App\Services\PaymentService;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;

/**
 * JSON API used by the Giftnify app. Same database, same rules and same
 * accounts as the website: a gift sent in the app shows on the website and back.
 */
class AppApiController extends Controller
{
    /* ---------------- Accounts ---------------- */

    public function register(Request $request): JsonResponse
    {
        $v = $request->validate([
            'name' => 'nullable|string|max:80',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => ['required', PasswordRule::min(8)],
        ]);

        $email = strtolower($v['email']);
        $user = User::create([
            'name' => trim((string)($v['name'] ?? '')) ?: Str::before($email, '@'),
            'email' => $email,
            'password' => Hash::make($v['password']),
            'role' => 'user',
        ]);

        return response()->json(['token' => $this->token($user, $request), 'user' => $this->me($user)], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $v = $request->validate(['email' => 'required|email', 'password' => 'required|string']);

        $key = 'api-login:' . strtolower($v['email']) . '|' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 10)) {
            return response()->json(['message' => 'Too many attempts. Wait a minute, then try again.'], 429);
        }

        $user = User::where('email', strtolower($v['email']))->first();
        if (!$user || !Hash::check($v['password'], $user->password)) {
            RateLimiter::hit($key, 60);
            return response()->json(['message' => "That email and password don't match."], 422);
        }
        if ($user->status && $user->status !== 'active') {
            return response()->json(['message' => 'This account is suspended. Contact support.'], 403);
        }
        RateLimiter::clear($key);

        return response()->json(['token' => $this->token($user, $request), 'user' => $this->me($user)]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();
        return response()->json(['ok' => true]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);
        if (!config('services.email_delivery')) {
            return response()->json(['message' => "Password emails aren't switched on yet. Contact support."], 503);
        }
        try {
            Password::sendResetLink(['email' => strtolower($request->input('email'))]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => "We couldn't send the email right now. Try again shortly."], 503);
        }
        // Same answer whether or not the account exists.
        return response()->json(['ok' => true]);
    }

    public function showMe(Request $request): JsonResponse
    {
        return response()->json($this->me($request->user()));
    }

    public function updateMe(Request $request): JsonResponse
    {
        $v = $request->validate([
            'name' => 'sometimes|string|min:2|max:80',
            'phone' => 'sometimes|nullable|string|max:40',
            'preferred_currency' => 'sometimes|string|in:' . implode(',', array_keys((array)config('services.payments.routes'))),
        ]);
        $request->user()->update($v);
        return response()->json($this->me($request->user()->fresh()));
    }

    /* ---------------- Shared content ---------------- */

    public function content(): JsonResponse
    {
        $payable = PaymentService::payableCurrencies();
        $features = (array)(CmsSetting::get('features', []) ?? []);

        $currencies = CmsCurrency::where('active', true)->get()
            ->filter(fn ($c) => in_array($c->code, $payable, true))
            ->map(fn ($c) => [
                'code' => $c->code,
                'symbol' => $c->symbol,
                'name' => $c->name,
                'decimals' => (int)$c->decimals,
                'per_usd' => (float)$c->per_usd,
            ])->values();

        return response()->json([
            'occasions' => CmsOccasion::where('active', true)->orderBy('sort_order')->get(['id', 'label', 'icon']),
            'items' => DB::table('cms_catalog_items')->where('available', true)->orderBy('name')
                ->get(['name', 'category', 'icon', 'price_usd'])
                ->map(fn ($i) => ['name' => $i->name, 'cat' => $i->category, 'icon' => $i->icon, 'price' => (float)$i->price_usd]),
            'currencies' => $currencies,
            'fee_rate' => (float)(CmsSetting::get('service_fee_rate', 0.02) ?? 0.02),
            'features' => [
                'giftsense' => (bool)($features['giftsense_ai'] ?? $features['giftsense'] ?? true),
                'promo_codes' => (bool)($features['promo_codes'] ?? true),
                'video_messages' => (bool)($features['video_messages'] ?? true),
                'voice_messages' => (bool)($features['voice_messages'] ?? true),
            ],
            'text' => collect(['home_headline', 'home_headline_accent', 'home_subtitle', 'home_cta'])
                ->mapWithKeys(fn ($k) => [$k => CmsSetting::get($k)])->filter(fn ($v) => is_string($v) && $v !== '')->all(),
            'limits' => (array)(CmsSetting::get('limits', []) ?? []),
            'delivery_channels' => DeliveryService::availableChannels(),
            'website_url' => rtrim(config('app.url'), '/'),
        ]);
    }

    public function banks(): JsonResponse
    {
        return response()->json(['banks' => BankService::names()]);
    }

    /** Checks a promo code before checkout. The real discount is still priced on the server at payment. */
    public function checkPromo(Request $request): JsonResponse
    {
        $v = $request->validate(['code' => 'required|string|min:2|max:40']);
        $key = "promo:{$request->user()->id}";
        if (RateLimiter::tooManyAttempts($key, 10)) {
            return response()->json(['message' => 'Too many attempts. Wait a minute, then try again.'], 429);
        }
        RateLimiter::hit($key, 60);

        $promo = \App\Models\PromoCode::where('code', strtoupper(trim($v['code'])))->first();
        return response()->json($promo && $promo->isValid()
            ? ['valid' => true, 'code' => $promo->code, 'percent_off' => (int)$promo->percent_off]
            : ['valid' => false]);
    }

    /* ---------------- Gifts I've sent ---------------- */

    public function myGifts(Request $request): JsonResponse
    {
        $gifts = Gift::where('sender_id', $request->user()->id)->latest()->limit(100)->get();

        return response()->json($gifts->map(fn (Gift $g) => [
            'token' => $g->token,
            'recipient_name' => $g->recipient_name,
            'occasion' => $g->occasion,
            'message_type' => $g->message_type,
            'message_text' => $g->message_text,
            'currency' => $g->currency,
            'amount' => (float)$g->amount,
            'item' => $g->item,
            'delivery' => $g->delivery,
            'delivery_status' => $g->delivery_status,
            'status' => $g->status,
            'sender_hint' => $g->sender_hint,
            'reply_text' => $g->reply_text,
            'reply_media_url' => $g->reply_media_path ? Storage::disk('public')->url($g->reply_media_path) : null,
            'share_link' => route('reveal.show', ['token' => $g->token]),
            'created_at' => $g->created_at?->toISOString(),
        ]));
    }

    /* ---------------- Saved people & occasions ---------------- */

    public function contacts(Request $request): JsonResponse
    {
        return response()->json(Contact::where('user_id', $request->user()->id)->orderBy('name')
            ->get(['id', 'name', 'phone', 'email', 'occasion', 'occasion_date'])
            ->map(fn ($c) => [...$c->toArray(), 'occasion_date' => $c->occasion_date?->format('Y-m-d')]));
    }

    public function storeContact(Request $request): JsonResponse
    {
        $v = $request->validate([
            'name' => 'required|string|min:2|max:80',
            'phone' => 'nullable|string|max:40',
            'email' => 'nullable|email|max:120',
            'occasion' => 'nullable|string|max:50',
            'occasion_date' => 'nullable|date',
        ]);
        $c = $request->user()->contacts()->create($v);
        return response()->json([...$c->toArray(), 'occasion_date' => $c->occasion_date?->format('Y-m-d')], 201);
    }

    public function destroyContact(Request $request, string $id): JsonResponse
    {
        $request->user()->contacts()->findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    /* ---------------- Support (no account needed) ---------------- */

    public function support(Request $request): JsonResponse
    {
        $v = $request->validate([
            'email' => 'required|email|max:254',
            'topic' => 'required|in:Payment,Missing gift,Redeeming a gift,Account access,Refund,Other',
            'body' => 'required|string|min:10|max:3000',
            'gift_token' => 'nullable|string|max:64',
        ]);

        $key = "support:{$request->ip()}";
        if (RateLimiter::tooManyAttempts($key, 3)) {
            return response()->json(['message' => 'Too many requests. Please wait a minute.'], 429);
        }
        RateLimiter::hit($key, 60);

        DB::table('guest_support_requests')->insert([
            'id' => (string)Str::uuid(),
            'email' => strtolower($v['email']),
            'topic' => $v['topic'],
            'body' => $v['body'],
            'gift_token' => $v['gift_token'] ?? null,
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return response()->json(['ok' => true], 201);
    }

    /* ------------------------------------------------------------------ */

    private function token(User $user, Request $request): string
    {
        $device = Str::limit((string)$request->userAgent(), 60, '') ?: 'app';
        return $user->createToken("app:{$device}")->plainTextToken;
    }

    private function me(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'is_staff' => $user->isStaff(),
            'preferred_currency' => $user->preferred_currency,
            'wallets' => WalletService::balances($user),
            'gifts_sent' => Gift::where('sender_id', $user->id)->whereNotIn('status', ['Awaiting Payment', 'Refunded', 'Cancelled'])->count(),
        ];
    }
}
