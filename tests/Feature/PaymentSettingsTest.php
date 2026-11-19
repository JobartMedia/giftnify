<?php

namespace Tests\Feature;

use App\Models\CmsSetting;
use App\Models\User;
use App\Services\PaymentService;
use App\Services\PaymentSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PaymentSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role): User
    {
        return User::create(['name' => ucfirst($role), 'email' => "{$role}@example.com", 'password' => Hash::make('a-long-password'), 'role' => $role]);
    }

    public function test_admin_saves_paystack_keys_encrypted_and_they_take_effect(): void
    {
        $key = 'sk_test_' . str_repeat('a1B2c3', 6);
        $this->actingAs($this->user('admin'))
            ->post('/admin/settings/payments', ['keys' => ['paystack_secret_key' => $key, 'paystack_public_key' => 'pk_test_' . str_repeat('z9', 15)]])
            ->assertSessionHasNoErrors();

        $raw = json_encode(CmsSetting::get(PaymentSettings::SETTING));
        $this->assertStringNotContainsString($key, $raw, 'stored encrypted, never in plain text');

        config(['services.payments.paystack_secret_key' => null]);
        PaymentSettings::apply();
        $this->assertSame($key, config('services.payments.paystack_secret_key'));
        $this->assertTrue(PaymentService::isProviderReady('paystack'));

        $page = $this->get('/admin/settings/payments')->assertOk()->viewData('page');
        $this->assertSame(substr($key, -4), $page['props']['settings']['fields']['paystack_secret_key']['ending']);
        $this->assertStringNotContainsString($key, json_encode($page));
    }

    public function test_wrong_looking_key_is_rejected_and_staff_who_are_not_admins_cannot_open_it(): void
    {
        $this->actingAs($this->user('admin'))
            ->post('/admin/settings/payments', ['keys' => ['paystack_secret_key' => 'pk_live_oops']])
            ->assertSessionHasErrors('keys.paystack_secret_key');

        $this->actingAs($this->user('support'))->get('/admin/settings/payments')->assertForbidden();
    }

    public function test_admin_can_turn_off_test_payments(): void
    {
        config(['services.payments.allow_demo' => true]);
        $this->actingAs($this->user('admin'))->post('/admin/settings/payments', ['allow_demo' => false])->assertSessionHasNoErrors();
        PaymentSettings::apply();
        $this->assertFalse(PaymentService::demoAllowed());
    }
}
