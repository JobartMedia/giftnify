<?php

namespace App\Http\Controllers;

use App\Models\Withdrawal;
use App\Services\WalletService;
use App\Models\AuditLog;
use App\Models\CmsSetting;
use App\Models\Gift;
use App\Models\GiftRedemption;
use App\Models\Payment;
use App\Models\PromoCode;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    public function dashboard(): Response
    {
        $stats = [
            'total_gifts' => Gift::count(),
            'delivered_gifts' => Gift::whereIn('status', ['Sent', 'Opened', 'Unlocked', 'Redeemed'])->count(),
            'total_volume' => (float)Payment::where('status', 'paid')->sum('amount'),
            'pending_payouts' => GiftRedemption::where('payout_status', 'pending')->count(),
            'users_count' => User::count(),
        ];

        $recentGifts = Gift::latest()->take(8)->get();
        $recentPayments = Payment::latest()->take(8)->get();

        return Inertia::render('Admin/Dashboard', [
            'stats' => $stats,
            'recent_gifts' => $recentGifts,
            'recent_payments' => $recentPayments,
        ]);
    }

    public function gifts(): Response
    {
        $gifts = Gift::latest()->paginate(25);
        return Inertia::render('Admin/Gifts', [
            'gifts' => $gifts,
        ]);
    }

    public function updateGiftStatus(Request $request, string $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:Awaiting Payment,Preparing,Sent,Opened,Message Viewed,Unlocked,Redeemed,Refunded,Cancelled',
        ]);

        $gift = Gift::findOrFail($id);
        $old = $gift->status;
        $gift->update(['status' => $validated['status']]);

        AuditLog::record('gift.status_update', $gift->token, [
            'from' => $old,
            'to' => $validated['status'],
        ]);

        return back()->with('success', "Gift status updated to {$validated['status']}.");
    }

    public function payments(): Response
    {
        $payments = Payment::with('user')->latest()->paginate(25);
        return Inertia::render('Admin/Payments', [
            'payments' => $payments,
        ]);
    }

    public function promos(): Response
    {
        $promos = PromoCode::latest()->get();
        return Inertia::render('Admin/Promos', [
            'promos' => $promos,
        ]);
    }

    public function storePromo(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:promo_codes,code|max:30',
            'percent_off' => 'required|integer|min:1|max:100',
            'max_uses' => 'nullable|integer|min:1',
            'expires_at' => 'nullable|date',
        ]);

        PromoCode::create([
            'code' => strtoupper($validated['code']),
            'percent_off' => $validated['percent_off'],
            'max_uses' => $validated['max_uses'],
            'expires_at' => $validated['expires_at'],
            'active' => true,
        ]);

        return back()->with('success', 'Promo code created successfully.');
    }

    public function redemptions(): Response
    {
        $redemptions = GiftRedemption::with('gift')->latest()->paginate(25);
        return Inertia::render('Admin/Redemptions', [
            'redemptions' => $redemptions,
        ]);
    }

    public function updateRedemptionStatus(Request $request, string $id)
    {
        $validated = $request->validate([
            'payout_status' => 'required|in:pending,processing,completed,failed,cancelled',
        ]);

        $redemption = GiftRedemption::findOrFail($id);
        $redemption->update([
            'payout_status' => $validated['payout_status'],
            'processed_at' => $validated['payout_status'] === 'completed' ? now() : null,
        ]);

        AuditLog::record('payout.status_update', $redemption->gift_token, [
            'status' => $validated['payout_status'],
        ]);

        return back()->with('success', "Payout status updated to {$validated['payout_status']}.");
    }

    public function withdrawals(Request $request): Response
    {
        abort_unless($request->user()->isFinance(), 403);

        $list = Withdrawal::with('user:id,name,email')->latest()->paginate(25);
        $list->getCollection()->transform(fn ($w) => [
            'id' => $w->id,
            'user' => $w->user ? ['name' => $w->user->name, 'email' => $w->user->email] : null,
            'amount' => (float)$w->amount,
            'currency' => $w->currency,
            'method' => $w->method,
            'details' => $w->details, // decrypted for finance staff only
            'status' => $w->status,
            'failure_reason' => $w->failure_reason,
            'created_at' => $w->created_at?->toISOString(),
            'processed_at' => $w->processed_at?->toISOString(),
        ]);

        return Inertia::render('Admin/Withdrawals', ['withdrawals' => $list]);
    }

    public function updateWithdrawal(Request $request, string $id)
    {
        abort_unless($request->user()->isFinance(), 403);

        $v = $request->validate([
            'status' => 'required|in:processing,paid,failed,cancelled',
            'reason' => 'nullable|string|max:200',
        ]);

        WalletService::updateWithdrawal(Withdrawal::findOrFail($id), $v['status'], $request->user(), $v['reason'] ?? null);

        return back()->with('success', "Withdrawal marked {$v['status']}.");
    }
}
