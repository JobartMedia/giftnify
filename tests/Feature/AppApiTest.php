<?php

namespace Tests\Feature;

use App\Models\Gift;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** The app talks to the same database as the website through /api/v1. */
class AppApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
    }

    private function signUp(string $email, string $name = 'Test Person'): array
    {
        $r = $this->postJson('/api/v1/auth/register', ['name' => $name, 'email' => $email, 'password' => 'a-long-password'])
            ->assertCreated()->assertJsonStructure(['token', 'user' => ['id', 'email', 'wallets']]);
        return [$r->json('token'), User::where('email', $email)->first()];
    }

    private function api(string $token): static
    {
        return $this->withHeaders(['Authorization' => "Bearer {$token}", 'Accept' => 'application/json']);
    }

    public function test_one_account_works_on_both_website_and_app(): void
    {
        [$token] = $this->signUp('seun@example.com', 'Seun Balogun');

        // Same email + password signs in on the website...
        $this->post('/login', ['email' => 'seun@example.com', 'password' => 'a-long-password'])->assertRedirect();
        $this->assertAuthenticated();

        // ...and on the app.
        $this->postJson('/api/v1/auth/login', ['email' => 'seun@example.com', 'password' => 'a-long-password'])
            ->assertOk()->assertJsonPath('user.email', 'seun@example.com');
        $this->postJson('/api/v1/auth/login', ['email' => 'seun@example.com', 'password' => 'wrong'])->assertStatus(422);
    }

    public function test_gift_made_in_the_app_shows_on_the_website_and_back(): void
    {
        [$token, $seun] = $this->signUp('seun@example.com', 'Seun Balogun');

        // Create + pay in the app (test payments are on in testing).
        $created = $this->api($token)->post('/api/v1/gifts', [
            'recipient_name' => 'Tolu Adebayo', 'delivery' => 'Link', 'occasion' => 'Birthday',
            'message_type' => 'text', 'message_text' => 'Happy birthday Tolu', 'currency' => 'NGN', 'amount' => 25000,
        ])->assertOk()->json();
        $this->api($token)->postJson("/api/v1/checkout/{$created['token']}/start")->assertOk()->assertJson(['status' => 'paid']);

        // The website's gifts page (signed in with a session) lists it.
        $page = $this->actingAs($seun)->get('/activity')->assertOk()->viewData('page');
        $this->assertSame($created['token'], $page['props']['gifts']['data'][0]['token']);

        // A gift made on the website appears in the app list.
        $web = Gift::create(['token' => 'webGift12345', 'sender_id' => $seun->id, 'sender_name' => 'Seun Balogun', 'recipient_name' => 'Amaka',
            'occasion' => 'Thank You', 'message_type' => 'text', 'message_text' => 'Thanks', 'currency' => 'NGN', 'amount' => 5000,
            'delivery' => 'Link', 'status' => 'Sent']);
        $tokens = collect($this->api($token)->getJson('/api/v1/gifts')->assertOk()->json())->pluck('token');
        $this->assertTrue($tokens->contains($web->token) && $tokens->contains($created['token']));
    }

    public function test_recipient_opens_in_the_app_and_wallet_is_shared_with_the_website(): void
    {
        [, $seun] = $this->signUp('seun@example.com', 'Seun Balogun');
        [$toluToken, $tolu] = $this->signUp('tolu@example.com', 'Tolu Adebayo');
        $gift = Gift::create(['token' => 'giftForTolu1', 'sender_id' => $seun->id, 'sender_name' => 'Seun Balogun', 'recipient_name' => 'Tolu',
            'occasion' => 'Birthday', 'message_type' => 'text', 'message_text' => 'Happy birthday', 'currency' => 'NGN', 'amount' => 25000,
            'delivery' => 'Link', 'status' => 'Sent', 'expires_at' => now()->addDays(90)]);

        // The sealed gift never includes the sender or the value.
        $sealed = $this->getJson("/api/v1/gifts/{$gift->token}/sealed")->assertOk()->getContent();
        $this->assertStringNotContainsString('Seun', $sealed);
        $this->assertStringNotContainsString('25000', $sealed);

        $this->postJson("/api/v1/gifts/{$gift->token}/status", ['status' => 'Opened'])->assertOk();
        $this->api($toluToken)->postJson("/api/v1/gifts/{$gift->token}/reveal")->assertOk()
            ->assertJsonPath('sender_name', 'Seun Balogun')
            ->assertJsonPath('wallet.credited', true)
            ->assertJsonPath('wallet.balance', 25000);

        // Same balance in the app and on the website.
        $this->api($toluToken)->getJson('/api/v1/wallet')->assertOk()->assertJsonPath('wallets.0.balance', 25000);
        $web = $this->actingAs($tolu)->get('/wallet')->assertOk()->viewData('page');
        $this->assertEquals(25000, $web['props']['wallets'][0]['balance']);
    }

    public function test_app_code_ticket_unlocks_payout_for_a_gift_sent_to_an_email(): void
    {
        config(['services.email_delivery' => true]);
        Mail::fake();
        [, $seun] = $this->signUp('seun@example.com', 'Seun Balogun');
        [$toluToken] = $this->signUp('tolu-other@example.com', 'Tolu');
        $gift = Gift::create(['token' => 'emailGift123', 'sender_id' => $seun->id, 'sender_name' => 'Seun', 'recipient_name' => 'Tolu',
            'occasion' => 'Birthday', 'message_type' => 'text', 'message_text' => 'Hi', 'currency' => 'NGN', 'amount' => 5000,
            'delivery' => 'Email', 'recipient_contact' => 'tolu@example.com', 'status' => 'Unlocked', 'revealed_at' => now()]);

        $this->api($toluToken)->postJson("/api/v1/gifts/{$gift->token}/claim")->assertStatus(403);

        $this->postJson("/api/v1/gifts/{$gift->token}/code")->assertOk();
        $code = null;
        $entry = cache()->get("gift-code:{$gift->token}");
        $this->assertNotNull($entry);
        foreach (range(100000, 999999) as $try) {
            if (hash_equals($entry['hash'], hash('sha256', $try . $gift->token))) { $code = (string)$try; break; }
        }
        $ticket = $this->postJson("/api/v1/gifts/{$gift->token}/code/verify", ['code' => $code])->assertOk()->json('ticket');
        $this->assertNotEmpty($ticket);

        $this->api($toluToken)->withHeader('X-Gift-Verification', $ticket)
            ->postJson("/api/v1/gifts/{$gift->token}/claim")->assertOk()->assertJson(['result' => 'credited', 'balance' => 5000]);
    }

    public function test_contacts_content_and_errors_are_json(): void
    {
        [$token] = $this->signUp('seun@example.com');
        $this->api($token)->postJson('/api/v1/contacts', ['name' => 'Mama Ada', 'occasion' => 'Birthday', 'occasion_date' => '1965-11-02'])->assertCreated();
        $this->api($token)->getJson('/api/v1/contacts')->assertOk()->assertJsonPath('0.occasion_date', '1965-11-02');

        $this->getJson('/api/v1/content')->assertOk()
            ->assertJsonStructure(['occasions', 'currencies', 'fee_rate', 'features', 'delivery_channels'])
            ->assertJsonPath('delivery_channels', ['Link']);

        $this->flushHeaders(); $this->app['auth']->forgetGuards(); // each real request starts signed out
        $this->getJson('/api/v1/gifts')->assertUnauthorized()->assertJsonStructure(['message']);
        $this->api($token)->postJson('/api/v1/gifts', [])->assertStatus(422)->assertJsonStructure(['errors']);
        $this->postJson('/api/v1/ai/write-message', ['recipient' => 'Tolu'])->assertOk()->assertJsonStructure(['text']);
    }

    public function test_app_payment_return_goes_only_to_allowed_app_addresses(): void
    {
        $this->assertTrue(\App\Http\Controllers\PaymentController::allowedReturn('http://localhost:3000/anything'));
        $this->assertFalse(\App\Http\Controllers\PaymentController::allowedReturn('https://evil.example/phish'));
    }
}
