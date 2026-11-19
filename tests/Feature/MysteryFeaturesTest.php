<?php

namespace Tests\Feature;

use App\Jobs\DeliverGift;
use App\Models\Gift;
use App\Models\User;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class MysteryFeaturesTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $email, string $name = 'Adebayo Okon'): User
    {
        return User::create(['name' => $name, 'email' => $email, 'password' => Hash::make('a-long-password'), 'role' => 'user']);
    }

    private function gift(array $extra = []): Gift
    {
        $sender = $this->user('bayo' . uniqid() . '@example.com');
        return Gift::create(array_merge([
            'token' => Gift::generateSecureToken(12), 'sender_id' => $sender->id, 'sender_name' => 'Adebayo Okon',
            'recipient_name' => 'Tolu', 'occasion' => 'Birthday', 'message_type' => 'text', 'message_text' => 'Happy birthday!',
            'currency' => 'NGN', 'amount' => 25000, 'delivery' => 'Link', 'status' => 'Sent', 'expires_at' => now()->addDays(90),
        ], $extra));
    }

    public function test_guess_game_gives_one_hint_per_try_and_accepts_nicknames(): void
    {
        $g = $this->gift(['reveal_mode' => 'guess', 'guess_hints' => ['We met in school.', 'I have dreads.', 'I called you last week.'], 'guess_answers' => ['Bayo']]);
        $page = $this->getJson("/api/v1/gifts/{$g->token}/sealed")->assertOk()->json('gift');
        $this->assertSame(['We met in school.'], $page['guess']['hints']);
        $this->assertStringNotContainsString('Adebayo', json_encode($page));

        // Must play the message first.
        $this->postJson("/gift/{$g->token}/guess", ['guess' => 'Tunde'])->assertStatus(409);
        $this->postJson("/gift/{$g->token}/status", ['status' => 'Opened'])->assertOk();

        $this->postJson("/gift/{$g->token}/guess", ['guess' => 'Tunde'])->assertOk()
            ->assertJson(['result' => 'wrong', 'tries_left' => 2, 'hints' => ['We met in school.', 'I have dreads.']])
            ->assertJsonMissing(['sender_name' => 'Adebayo Okon']);
        $this->postJson("/gift/{$g->token}/guess", ['guess' => "It's Bayo!"])->assertOk()
            ->assertJson(['result' => 'correct', 'sender_name' => 'Adebayo Okon']);
        $this->assertSame('correct', $g->fresh()->guess_result);
        $this->postJson("/gift/{$g->token}/reveal")->assertOk()->assertJson(['guess_result' => 'correct', 'amount' => 25000]);
    }

    public function test_three_wrong_guesses_end_the_game_and_revealing_early_counts_as_skipped(): void
    {
        $g = $this->gift(['reveal_mode' => 'guess', 'guess_hints' => ['One.', 'Two.', 'Three.']]);
        $this->postJson("/gift/{$g->token}/status", ['status' => 'Opened']);
        foreach (['Ada', 'Chidi'] as $n) $this->postJson("/gift/{$g->token}/guess", ['guess' => $n])->assertJson(['result' => 'wrong']);
        $this->postJson("/gift/{$g->token}/guess", ['guess' => 'Emeka'])->assertJson(['result' => 'out', 'tries_left' => 0]);
        $this->postJson("/gift/{$g->token}/guess", ['guess' => 'Adebayo'])->assertJson(['result' => 'finished']);

        $skip = $this->gift(['reveal_mode' => 'guess', 'guess_hints' => ['One.']]);
        $this->postJson("/gift/{$skip->token}/status", ['status' => 'Opened']);
        $this->postJson("/gift/{$skip->token}/reveal")->assertOk()->assertJson(['guess_result' => 'skipped', 'sender_name' => 'Adebayo Okon']);
    }

    public function test_scheduled_gift_stays_locked_with_the_message_hidden_until_it_unlocks(): void
    {
        $g = $this->gift(['unlock_at' => now()->addHours(3), 'value_teaser' => 'figures', 'sender_hint' => 'Someone close.']);
        $page = $this->getJson("/api/v1/gifts/{$g->token}/sealed")->assertOk()->json('gift');
        $this->assertTrue($page['locked']);
        $this->assertSame('', $page['message_text']);
        $this->assertNull($page['hint']);
        $this->assertSame("It's a 5-figure ₦ gift.", $page['teaser']);
        $this->postJson("/gift/{$g->token}/status", ['status' => 'Opened'])->assertStatus(423);
        $this->postJson("/gift/{$g->token}/reveal")->assertStatus(423);

        $this->travel(4)->hours();
        $this->assertFalse($this->getJson("/api/v1/gifts/{$g->token}/sealed")->json('gift.locked'));
    }

    public function test_scheduled_email_gift_sends_a_teaser_first_then_the_gift_when_it_unlocks(): void
    {
        config(['services.email_delivery' => true]);
        Mail::fake();
        $g = $this->gift(['unlock_at' => now()->addHour(), 'delivery' => 'Email', 'recipient_contact' => 'tolu@example.com']);
        (new DeliverGift($g->token))->handle();
        $this->assertSame('scheduled', $g->fresh()->delivery_status);
        $this->assertNotNull($g->fresh()->teaser_sent_at);

        $this->travel(2)->hours();
        $this->artisan('giftnify:release-scheduled')->assertSuccessful();
        $this->assertSame('sent', $g->fresh()->delivery_status);
    }

    public function test_anonymous_gift_never_shows_the_sender(): void
    {
        $g = $this->gift(['reveal_mode' => 'anonymous']);
        $this->assertSame('classic', $this->getJson("/api/v1/gifts/{$g->token}/sealed")->json('gift.reveal_mode'));
        $this->postJson("/gift/{$g->token}/status", ['status' => 'Opened']);
        $body = $this->postJson("/gift/{$g->token}/reveal")->assertOk()->assertJson(['sender_name' => 'Anonymous', 'anonymous' => true])->getContent();
        $this->assertStringNotContainsString('Adebayo', $body);
    }

    public function test_creator_link_gift_goes_only_to_the_creator_and_appears_on_their_wall(): void
    {
        $creator = $this->user('tolu@example.com', 'Tolu Adeyemi');
        $creator->update(['username' => 'tolu', 'creator_enabled' => true, 'creator_currency' => 'NGN']);
        $fan = $this->user('fan@example.com', 'Kemi Fan');

        $this->get('/@tolu')->assertOk();
        $this->get('/@nobody')->assertOk(); // friendly "not found" page

        $res = $this->actingAs($fan)->post('/create', [
            'creator' => 'tolu', 'delivery' => 'Link', 'occasion' => 'Just Because',
            'message_type' => 'text', 'message_text' => 'Love your work', 'currency' => 'NGN', 'amount' => 2000,
            'reveal_mode' => 'anonymous', 'wall_note' => 'Keep creating!', 'on_wall' => true,
        ])->assertOk()->json();
        $g = Gift::where('token', $res['token'])->first();
        $this->assertSame($creator->id, $g->recipient_user_id);
        $this->assertSame('Email', $g->delivery);
        $g->update(['status' => 'Sent']);

        $wall = $this->get('/@tolu')->viewData('page')['props']['creator']['wall'];
        $this->assertSame('Keep creating!', $wall[0]['note']);
        $this->assertSame('Anonymous', $wall[0]['from']);
        $this->assertStringNotContainsString('2000', json_encode($wall));

        // Someone else with the link can't take the money.
        $other = $this->user('other@example.com', 'Other');
        $this->actingAs($other)->postJson("/gift/{$g->token}/status", ['status' => 'Opened']);
        $this->actingAs($other)->postJson("/gift/{$g->token}/reveal")->assertOk()->assertJsonPath('wallet', null);
        $this->assertSame('not_yours', WalletService::creditGift($other, $g->token)['result']);

        // The creator opens it and the cash lands in their wallet.
        $this->actingAs($creator)->postJson("/gift/{$g->token}/reveal")->assertOk()->assertJsonPath('wallet.balance', 2000);

        // Own link is refused.
        $this->actingAs($creator)->post('/create', ['creator' => 'tolu', 'delivery' => 'Link', 'occasion' => 'Birthday',
            'message_type' => 'text', 'currency' => 'NGN', 'amount' => 1000])->assertStatus(422);
    }

    public function test_creator_setup_validates_the_username(): void
    {
        $u = $this->user('me@example.com', 'Me');
        $this->actingAs($u)->post('/creator', ['username' => 'admin', 'name' => 'Me', 'currency' => 'NGN', 'amounts' => [1000, 2000, 5000]])
            ->assertSessionHasErrors('username');
        $this->actingAs($u)->post('/creator', ['username' => 'Tolu_Makes', 'name' => 'Tolu', 'bio' => 'Designer', 'currency' => 'NGN',
            'amounts' => [1000, 2000, 5000], 'wall' => true, 'creator_enabled' => true])->assertSessionHasNoErrors();
        $this->assertSame('tolu_makes', $u->fresh()->username);
        $this->get('/@tolu_makes')->assertOk();
    }
}
