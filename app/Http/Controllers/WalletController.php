<?php

namespace App\Http\Controllers;

use App\Models\Gift;
use App\Models\WalletTransaction;
use App\Services\BankService;
use App\Services\RecipientVerification;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Inertia;
use Inertia\Response;

class WalletController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Wallet/Index', self::walletData($request->user()));
    }

    /** App (API): the same wallet data as JSON. */
    public function show(Request $request): JsonResponse
    {
        return response()->json(self::walletData($request->user()));
    }

    public static function walletData(\App\Models\User $user): array
    {
        return [
            'wallets' => WalletService::balances($user),
            'transactions' => WalletTransaction::where('user_id', $user->id)
                ->latest()->limit(50)
                ->get(['id', 'type', 'source', 'amount', 'balance_after', 'description', 'created_at', 'wallet_id'])
                ->load('wallet:id,currency')
                ->map(fn ($t) => [
                    'id' => $t->id,
                    'type' => $t->type,
                    'source' => $t->source,
                    'amount' => (float)$t->amount,
                    'currency' => $t->wallet?->currency,
                    'description' => $t->description,
                    'created_at' => $t->created_at?->toISOString(),
                ]),
            'withdrawals' => $user->withdrawals()->latest()->limit(20)->get()->map(fn ($w) => [
                'id' => $w->id,
                'amount' => (float)$w->amount,
                'currency' => $w->currency,
                'method' => $w->method,
                'destination' => $w->maskedDestination(),
                'status' => $w->status,
                'failure_reason' => $w->failure_reason,
                'created_at' => $w->created_at?->toISOString(),
            ]),
            'methods' => WalletService::WITHDRAWAL_METHODS,
            'banks' => BankService::names(),
            'minimums' => WalletService::MIN_WITHDRAWAL,
        ];
    }

    public function withdraw(Request $request): JsonResponse
    {
        $user = $request->user();
        $key = "withdraw:{$user->id}";
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json(['result' => 'rate_limited'], 429);
        }
        RateLimiter::hit($key, 60);

        $v = $request->validate([
            'currency' => 'required|string|max:10',
            'amount' => 'required|numeric|min:0.01',
            'method' => 'required|in:' . implode(',', WalletService::WITHDRAWAL_METHODS),
            'bank' => 'required_if:method,Bank Transfer|nullable|string|max:60',
            'account' => ['required_if:method,Bank Transfer', 'nullable', 'regex:/^\d{10}$/'],
            'account_name' => 'nullable|string|max:120',
            'destination' => 'required_unless:method,Bank Transfer|nullable|string|min:5|max:120',
        ]);

        if ($v['method'] === 'Bank Transfer') {
            try {
                $confirmed = BankService::resolve($v['bank'], $v['account']);
            } catch (\Throwable $e) {
                return response()->json(['result' => 'bank_unavailable'], 503);
            }
            if (!$confirmed) {
                return response()->json(['result' => 'bank_not_found'], 422);
            }
            $v['account_name'] = $confirmed; // the bank's name, not what was typed
        }

        $details = $v['method'] === 'Bank Transfer'
            ? ['bank' => $v['bank'], 'account' => $v['account'], 'account_name' => $v['account_name']]
            : ['destination' => $v['destination']];

        $r = WalletService::requestWithdrawal($user, strtoupper($v['currency']), (float)$v['amount'], $v['method'], $details);

        return response()->json([
            'result' => $r['result'],
            'minimum' => $r['minimum'] ?? null,
            'wallets' => WalletService::balances($user),
        ], $r['result'] === 'ok' ? 200 : 422);
    }

    /** Adds a revealed cash gift to the signed-in user's wallet. */
    public function claim(Request $request, string $token): JsonResponse
    {
        $gift = Gift::where('token', $token)->first();
        if ($gift && RecipientVerification::required($gift, $request)) {
            return response()->json(['result' => 'verify_required'], 403);
        }
        $r = WalletService::creditGift($request->user(), $token);
        $wallet = $r['wallet'] ?? null;

        return response()->json([
            'result' => $r['result'],
            'balance' => $wallet ? (float)$wallet->balance : null,
            'currency' => $wallet?->currency,
        ], in_array($r['result'], ['credited', 'already_credited'], true) ? 200 : 422);
    }
}
