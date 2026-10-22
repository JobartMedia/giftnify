<?php

namespace Tests\Feature;

use App\Models\Gift;
use App\Models\Payment;
use App\Models\User;
use App\Models\Wallet;
use App\Models\Withdrawal;
use App\Services\PaymentService;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class GiftFlowTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $email = 'tolu@example.com', string $role = 'user'): User
    {
        return User::create(['name' => ucfirst(explode('@', $email)[0]) . ' Test', 'email' => $email, 'password' => Hash::make('secret-password'), 'role' => $role]);
    }

    private function gift(array $over = []): Gift
    {
        return Gift::create(array_merge([
            'token' => Gift::generateSecureToken(12),
            'sender_name' => 'Seun Balogun',
            'recipient_name' => 'Tolu',
            'occasion' => 'Birthday',
            'message_type' => 'text',
            'message_text' => 'Happy birthday',
            'currency' => 'NGN',
            'amount' => 25000,
            'delivery' => 'Link',
            'status' => 'Sent',
            'expires_at' => now()->addDays(90),
        ], $over));
    }

    public function test_page_load_never_contains_sender_or_value(): void
    {
        $gift = $this->gift();
        $html = $this->get("/gift/{$gift->token}")->assertOk()->getContent();
        $this->assertStringNotContainsString('Seun Balogun', $html);
        $this->assertStringNotContainsString('25000', $html);
    }

    public function test_reveal_requires_message_to_be_started(): void
    {
        $gift = $this->gift();
        $this->postJson("/gift/{$gift->token}/reveal")->assertStatus(409);

        $this->postJson("/gift/{$gift->token}/status", ['status' => 'Opened'])->assertOk();
        $this->postJson("/gift/{$gift->token}/reveal")->assertOk()
            ->assertJson(['sender_name' => 'Seun Balogun', 'amount' => 25000, 'currency' => 'NGN']);
    }

    public function test_signed_in_recipient_is_credited_once_at_reveal(): void
    {
        $me = $this->user();
        $gift = $this->gift(['status' => 'Opened']);

        $this->actingAs($me)->postJson("/gift/{$gift->token}/reveal")->assertOk()
            ->assertJsonPath('wallet.credited', true)
            ->assertJsonPath('wallet.balance', 25000);

        // Second reveal and an explicit claim never pay twice.
        $this->actingAs($me)->postJson("/gift/{$gift->token}/reveal")->assertOk();
        $this->actingAs($me)->postJson("/gift/{$gift->token}/claim")->assertOk();

        $this->assertSame(25000.0, (float)Wallet::where('user_id', $me->id)->value('balance'));
        $this->assertSame(1, $me->wallets()->first()->transactions()->count());
        $this->assertSame('Redeemed', $gift->fresh()->status);
    }

    public function test_sender_cannot_claim_own_gift(): void
    {
        $sender = $this->user('seun@example.com');
        $gift = $this->gift(['sender_id' => $sender->id, 'status' => 'Unlocked', 'revealed_at' => now()]);
        $this->assertSame('own_gift', WalletService::creditGift($sender, $gift->token)['result']);
    }

    public function test_gift_sent_to_a_phone_needs_a_code_before_money_moves(): void
    {
        $me = $this->user();
        $gift = $this->gift(['delivery' => 'SMS', 'recipient_contact' => '+2348035550142', 'status' => 'Opened']);

        $this->actingAs($me)->postJson("/gift/{$gift->token}/reveal")->assertOk()
            ->assertJsonPath('verify.required', true)
            ->assertJsonPath('wallet', null);

        $this->actingAs($me)->postJson("/gift/{$gift->token}/claim")->assertStatus(403)->assertJson(['result' => 'verify_required']);
        $this->postJson('/gift/redeem', ['token' => $gift->token, 'method' => 'Airtime Top-up', 'details' => ['destination' => '+2348035550142']])
            ->assertStatus(403);
    }

    public function test_email_code_is_sent_and_wrong_code_is_rejected(): void
    {
        config(['services.email_delivery' => true]);
        Mail::fake();
        $gift = $this->gift(['delivery' => 'Email', 'recipient_contact' => 'tolu@example.com', 'status' => 'Unlocked', 'revealed_at' => now()]);

        $this->postJson("/gift/{$gift->token}/code")->assertOk()->assertJson(['result' => 'ok']);
        $this->postJson("/gift/{$gift->token}/code/verify", ['code' => '000000'])->assertStatus(422)->assertJson(['result' => 'wrong']);
    }

    public function test_withdrawal_debits_and_failed_payout_refunds_once(): void
    {
        $me = $this->user();
        $staff = $this->user('finance@example.com', 'finance');
        $gift = $this->gift(['status' => 'Unlocked', 'revealed_at' => now()]);
        WalletService::creditGift($me, $gift->token);

        $this->assertSame('insufficient', WalletService::requestWithdrawal($me, 'NGN', 30000, 'Airtime Top-up', ['destination' => '+2348035550142'])['result']);
        $this->assertSame('below_minimum', WalletService::requestWithdrawal($me, 'NGN', 500, 'Airtime Top-up', ['destination' => '+2348035550142'])['result']);

        $r = WalletService::requestWithdrawal($me, 'NGN', 10000, 'Airtime Top-up', ['destination' => '+2348035550142']);
        $this->assertSame('ok', $r['result']);
        $this->assertSame(15000.0, (float)Wallet::where('user_id', $me->id)->value('balance'));

        $w = Withdrawal::first();
        WalletService::updateWithdrawal($w, 'failed', $staff, 'Network down');
        WalletService::updateWithdrawal($w->fresh(), 'failed', $staff, 'again'); // final state: no second refund
        $this->assertSame(25000.0, (float)Wallet::where('user_id', $me->id)->value('balance'));
        $this->assertSame('failed', $w->fresh()->status);
    }

    public function test_bank_withdrawal_needs_a_bank_confirmed_account_name(): void
    {
        config(['services.payments.allow_demo' => false, 'services.payments.paystack_secret_key' => null]);
        $me = $this->user();
        $gift = $this->gift(['status' => 'Unlocked', 'revealed_at' => now()]);
        WalletService::creditGift($me, $gift->token);

        $this->actingAs($me)->postJson('/wallet/withdraw', [
            'currency' => 'NGN', 'amount' => 5000, 'method' => 'Bank Transfer',
            'bank' => 'Zenith Bank', 'account' => '0123456789', 'account_name' => 'Anyone I Like',
        ])->assertStatus(503)->assertJson(['result' => 'bank_unavailable']);
        $this->assertSame(0, Withdrawal::count());
    }

    public function test_demo_payments_are_refused_when_demo_is_off(): void
    {
        config(['services.payments.allow_demo' => false]);
        $this->assertNull(PaymentService::providerFor('NGN'));
        $this->assertSame([], PaymentService::payableCurrencies());

        $me = $this->user();
        $gift = $this->gift(['sender_id' => $me->id, 'status' => 'Awaiting Payment']);
        $this->actingAs($me)->post('/payment/start', ['token' => $gift->token])->assertRedirect();
        $this->assertSame('Awaiting Payment', $gift->fresh()->status);
        $this->assertSame(0, Payment::count());
    }

    public function test_currencies_route_to_the_right_provider(): void
    {
        config([
            'services.payments.allow_demo' => false,
            'services.payments.paystack_secret_key' => 'sk_test_x',
            'services.payments.flutterwave_secret_key' => 'FLWSECK_TEST-x',
        ]);
        $this->assertSame('paystack', PaymentService::providerFor('NGN'));
        $this->assertSame('flutterwave', PaymentService::providerFor('GBP'));
        $this->assertSame('flutterwave', PaymentService::providerFor('USD'));
        $this->assertNull(PaymentService::providerFor('CAD'));
    }

    public function test_promo_code_is_priced_on_the_server(): void
    {
        $me = $this->user();
        \App\Models\PromoCode::create(['code' => 'HELLO10', 'percent_off' => 10, 'active' => true]);
        $gift = $this->gift(['sender_id' => $me->id, 'status' => 'Awaiting Payment', 'amount' => 10000]);

        $this->actingAs($me)->postJson("/checkout/{$gift->token}/quote", ['promo_code' => 'hello10'])->assertOk()
            ->assertJson(['promo_applied' => true, 'amount' => 10000, 'fee' => 200, 'discount' => 1020, 'total' => 9180]);
        $this->actingAs($me)->postJson("/checkout/{$gift->token}/quote", ['promo_code' => 'NOPE'])->assertOk()
            ->assertJson(['promo_applied' => false, 'total' => 10200]);
    }

    public function test_demo_payment_marks_paid_once_and_link_gift_is_manual_delivery(): void
    {
        $me = $this->user();
        $gift = $this->gift(['sender_id' => $me->id, 'status' => 'Awaiting Payment']);
        $this->actingAs($me)->post('/payment/start', ['token' => $gift->token])->assertRedirect("/gifts/{$gift->token}/success");

        $gift->refresh();
        $this->assertSame('Sent', $gift->status);
        $this->assertSame('manual', $gift->delivery_status);
        $this->assertSame('paid', Payment::first()->status);
    }

    public function test_someone_else_cannot_view_or_pay_my_gift(): void
    {
        $owner = $this->user();
        $other = $this->user('other@example.com');
        $gift = $this->gift(['sender_id' => $owner->id, 'status' => 'Awaiting Payment']);
        $this->actingAs($other)->get("/checkout/{$gift->token}")->assertForbidden();
    }

    public function test_signing_up_never_creates_an_admin(): void
    {
        $this->post('/register', ['name' => 'First Person', 'email' => 'first@example.com', 'password' => 'a-long-password', 'password_confirmation' => 'a-long-password']);
        $this->assertSame('user', User::where('email', 'first@example.com')->value('role'));
    }

    public function test_paystack_webhook_confirms_payment_once_and_rejects_bad_signatures(): void
    {
        config(['services.payments.paystack_secret_key' => 'sk_test_secret', 'services.payments.allow_demo' => false]);
        \Illuminate\Support\Facades\Http::fake([
            'api.paystack.co/transaction/verify/*' => \Illuminate\Support\Facades\Http::response(['data' => ['status' => 'success', 'amount' => 1020000, 'currency' => 'NGN', 'id' => 991]]),
        ]);

        $me = $this->user();
        $gift = $this->gift(['sender_id' => $me->id, 'status' => 'Awaiting Payment', 'amount' => 10000]);
        Payment::create(['reference' => 'gn_ref_1', 'gift_token' => $gift->token, 'user_id' => $me->id, 'provider' => 'paystack',
            'amount' => 10000, 'fee' => 200, 'discount' => 0, 'currency' => 'NGN', 'status' => 'pending']);

        $body = json_encode(['event' => 'charge.success', 'data' => ['reference' => 'gn_ref_1']]);
        $this->call('POST', '/api/webhook/paystack', [], [], [], ['HTTP_X_PAYSTACK_SIGNATURE' => 'forged', 'CONTENT_TYPE' => 'application/json'], $body)->assertStatus(401);
        $this->assertSame('Awaiting Payment', $gift->fresh()->status);

        $sig = hash_hmac('sha512', $body, 'sk_test_secret');
        $this->call('POST', '/api/webhook/paystack', [], [], [], ['HTTP_X_PAYSTACK_SIGNATURE' => $sig, 'CONTENT_TYPE' => 'application/json'], $body)->assertOk();
        $this->call('POST', '/api/webhook/paystack', [], [], [], ['HTTP_X_PAYSTACK_SIGNATURE' => $sig, 'CONTENT_TYPE' => 'application/json'], $body)->assertOk();

        $this->assertSame('paid', Payment::first()->status);
        $this->assertSame('Sent', $gift->fresh()->status);
    }

    public function test_underpayment_is_not_accepted(): void
    {
        config(['services.payments.paystack_secret_key' => 'sk_test_secret']);
        \Illuminate\Support\Facades\Http::fake([
            'api.paystack.co/transaction/verify/*' => \Illuminate\Support\Facades\Http::response(['data' => ['status' => 'success', 'amount' => 100, 'currency' => 'NGN', 'id' => 5]]),
        ]);
        $me = $this->user();
        $gift = $this->gift(['sender_id' => $me->id, 'status' => 'Awaiting Payment', 'amount' => 10000]);
        Payment::create(['reference' => 'gn_ref_2', 'gift_token' => $gift->token, 'user_id' => $me->id, 'provider' => 'paystack',
            'amount' => 10000, 'fee' => 200, 'discount' => 0, 'currency' => 'NGN', 'status' => 'pending']);

        $this->assertSame('failed', PaymentService::finalizePayment('gn_ref_2')['status']);
        $this->assertSame('Awaiting Payment', $gift->fresh()->status);
    }

    public function test_sms_delivery_goes_through_termii_without_revealing_the_sender(): void
    {
        config(['services.termii.key' => 'tk_test', 'services.termii.base_url' => 'https://api.ng.termii.com']);
        \Illuminate\Support\Facades\Http::fake(['api.ng.termii.com/*' => \Illuminate\Support\Facades\Http::response(['code' => 'ok', 'message_id' => '1'])]);

        $gift = $this->gift(['delivery' => 'SMS', 'recipient_contact' => '+2348035550142', 'sender_hint' => 'Someone who knows you well.']);
        \App\Jobs\DeliverGift::dispatchSync($gift->token);

        $this->assertSame('sent', $gift->fresh()->delivery_status);
        \Illuminate\Support\Facades\Http::assertSent(function ($req) use ($gift) {
            return $req['channel'] === 'dnd' && $req['to'] === '2348035550142'
                && str_contains($req['sms'], "/gift/{$gift->token}")
                && !str_contains($req['sms'], 'Seun') && !str_contains($req['sms'], '25000');
        });
        $this->assertContains('SMS', \App\Services\DeliveryService::availableChannels());
        $this->assertNotContains('WhatsApp', \App\Services\DeliveryService::availableChannels());
    }
}
