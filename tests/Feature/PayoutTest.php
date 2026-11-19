<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Withdrawal;
use App\Services\PayoutService;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PayoutTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;
    private User $finance;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.payments.paystack_secret_key' => 'sk_test_' . str_repeat('x', 40)]);
        Cache::put('paystack-banks-ng', ['Guaranty Trust Bank' => '058'], 3600);
        $this->customer = User::create(['name' => 'Tolu', 'email' => 'tolu@example.com', 'password' => Hash::make('a-long-password'), 'role' => 'user']);
        $this->finance = User::create(['name' => 'Fin', 'email' => 'fin@example.com', 'password' => Hash::make('a-long-password'), 'role' => 'finance']);
        $wallet = WalletService::walletFor($this->customer, 'NGN');
        $wallet->update(['balance' => 50000]);
    }

    private function withdrawal(): Withdrawal
    {
        $r = WalletService::requestWithdrawal($this->customer, 'NGN', 20000, 'Bank Transfer',
            ['bank' => 'Guaranty Trust Bank', 'account' => '0123456789', 'account_name' => 'TOLU ADEBAYO']);
        return $r['withdrawal'];
    }

    private function fakePaystack(string $status = 'pending', int $code = 200): void
    {
        Http::fake([
            'api.paystack.co/transferrecipient' => Http::response(['status' => true, 'data' => ['recipient_code' => 'RCP_1']]),
            'api.paystack.co/transfer' => Http::response(['status' => $code === 200, 'message' => $code === 200 ? 'Transfer queued' : 'Your balance is not enough to fulfil this request',
                'data' => ['status' => $status, 'transfer_code' => 'TRF_1']], $code),
            'api.paystack.co/transfer/verify/*' => Http::response(['status' => true, 'data' => ['status' => 'success']]),
        ]);
    }

    public function test_manual_mode_never_calls_paystack(): void
    {
        Http::fake();
        $w = $this->withdrawal();
        PayoutService::afterRequested($w);
        Http::assertNothingSent();
        $this->assertSame('pending', $w->fresh()->status);
    }

    public function test_staff_send_then_webhook_marks_paid_and_never_sends_twice(): void
    {
        PayoutService::setMode('approve');
        $this->fakePaystack('pending');
        $w = $this->withdrawal();

        $this->actingAs($this->finance)->post("/admin/withdrawals/{$w->id}/send")->assertSessionHas('success');
        $w->refresh();
        $this->assertSame('processing', $w->status);
        $this->assertSame('gnw-' . $w->id, $w->transfer_reference);
        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/transfer') && $r['amount'] === 2000000 && $r['reference'] === 'gnw-' . $w->id);

        // A second click does nothing.
        $this->actingAs($this->finance)->post("/admin/withdrawals/{$w->id}/send")->assertSessionHas('error');

        // Paystack confirms by webhook (signed with the secret key).
        $body = json_encode(['event' => 'transfer.success', 'data' => ['reference' => 'gnw-' . $w->id]]);
        $sig = hash_hmac('sha512', $body, config('services.payments.paystack_secret_key'));
        $this->call('POST', '/api/public/payments/webhook/paystack', [], [], [], ['HTTP_X_PAYSTACK_SIGNATURE' => $sig, 'CONTENT_TYPE' => 'application/json'], $body)->assertOk();
        $this->assertSame('paid', $w->fresh()->status);
        $this->assertSame('paystack', $w->fresh()->payout_channel);
    }

    public function test_failed_transfer_refunds_wallet(): void
    {
        PayoutService::setMode('approve');
        $this->fakePaystack('failed');
        $w = $this->withdrawal();
        $this->assertEquals(30000, (float)WalletService::walletFor($this->customer, 'NGN')->balance);
        PayoutService::send($w, $this->finance);
        $this->assertSame('failed', $w->fresh()->status);
        $this->assertEquals(50000, (float)WalletService::walletFor($this->customer, 'NGN')->fresh()->balance);
    }

    public function test_refused_transfer_goes_back_to_pending_with_a_clear_reason(): void
    {
        PayoutService::setMode('approve');
        Http::fake([
            'api.paystack.co/transferrecipient' => Http::response(['status' => true, 'data' => ['recipient_code' => 'RCP_1']]),
            'api.paystack.co/transfer' => Http::response(['status' => false, 'message' => 'Your balance is not enough to fulfil this request'], 400),
        ]);
        $w2 = $this->withdrawal();
        $r = PayoutService::send($w2, $this->finance);
        $this->assertFalse($r['ok']);
        $this->assertStringContainsString('Top up your Paystack balance', $r['message']);
        $this->assertSame('pending', $w2->fresh()->status); // staff can retry or pay by hand
        $this->assertNull($w2->fresh()->transfer_reference);
    }

    public function test_auto_mode_sends_naira_bank_withdrawals_at_once_but_not_airtime(): void
    {
        PayoutService::setMode('auto');
        $this->fakePaystack('success');
        $this->actingAs($this->customer)->postJson('/wallet/withdraw', [
            'currency' => 'NGN', 'amount' => 5000, 'method' => 'Airtime Top-up', 'destination' => '+2348030000000',
        ])->assertOk();
        Http::assertNothingSent();

        $w = $this->withdrawal();
        PayoutService::afterRequested($w);
        $this->assertSame('paid', $w->fresh()->status);
    }
}
