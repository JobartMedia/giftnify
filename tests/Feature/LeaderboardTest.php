<?php

namespace Tests\Feature;

use App\Models\CmsCurrency;
use App\Models\Gift;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LeaderboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::create(2026, 10, 20, 12, 0, 0, 'Africa/Lagos'));
        CmsCurrency::updateOrCreate(['code' => 'NGN'], ['symbol' => '₦', 'name' => 'Naira', 'per_usd' => 1500]);
        CmsCurrency::updateOrCreate(['code' => 'USD'], ['symbol' => '$', 'name' => 'Dollar', 'per_usd' => 1]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function user(string $name, ?int $day = null, int $month = 10, array $extra = []): User
    {
        return User::create(array_merge([
            'name' => $name, 'email' => strtolower(str_replace(' ', '.', $name)) . '@example.com',
            'password' => Hash::make('a-long-password'), 'role' => 'user',
            'birth_day' => $day, 'birth_month' => $day ? $month : null, 'birthday_set_at' => $day ? now() : null,
        ], $extra));
    }

    private function gift(User $to, User|string $from, float $amount, string $at, string $currency = 'NGN', array $extra = []): Gift
    {
        $sender = $from instanceof User ? $from : null;
        $g = Gift::create(array_merge([
            'token' => Gift::generateSecureToken(12), 'sender_id' => $sender?->id, 'sender_name' => $sender?->name ?? $from,
            'recipient_name' => $to->name, 'recipient_contact' => $to->email, 'occasion' => 'Birthday',
            'message_type' => 'text', 'message_text' => 'Happy birthday!', 'currency' => $currency, 'amount' => $amount,
            'delivery' => 'Email', 'status' => 'Sent', 'expires_at' => now()->addDays(90),
        ], $extra));
        $g->forceFill(['created_at' => Carbon::parse($at, 'Africa/Lagos')->utc()])->save();
        return $g;
    }

    public function test_ranks_by_birthday_week_gifts_and_never_shows_amounts(): void
    {
        $aisha = $this->user('Aisha Bello', 15);
        $emeka = $this->user('Emeka Johnson', 18);
        $outside = $this->user('Late Gift', 10);
        $fans = collect(range(1, 4))->map(fn ($i) => $this->user("Fan {$i}"));

        // Aisha: 3 gifts in her week. ₦50,000 is 10 + 40 (capped) points.
        $this->gift($aisha, $fans[0], 50000, '2026-10-15 09:00');
        $this->gift($aisha, $fans[1], 2000, '2026-10-13 09:00');
        $this->gift($aisha, $fans[2], 500, '2026-10-17 20:00');
        // Emeka: $10 = ₦15,000 = 25 points.
        $this->gift($emeka, $fans[3], 10, '2026-10-18 09:00', 'USD');
        // Outside the week, and unpaid: neither counts.
        $this->gift($outside, $fans[0], 9000, '2026-10-01 09:00');
        $this->gift($emeka, $fans[0], 9000, '2026-10-18 09:00', 'NGN', ['status' => 'Awaiting Payment']);

        $res = $this->getJson('/api/v1/leaderboard?month=10&year=2026')->assertOk();
        $entries = $res->json('board.entries');
        $this->assertSame(['Aisha Bello', 'Emeka Johnson'], array_column($entries, 'name'));
        $this->assertSame([3, 1], array_column($entries, 'gifts'));
        $this->assertSame(50 + 12 + 10, $entries[0]['points']);
        $this->assertSame(25, $entries[1]['points']);
        $json = json_encode($res->json());
        $this->assertStringNotContainsString('50000', $json);
        $this->assertStringNotContainsString('@example.com', $json);
    }

    public function test_one_sender_counts_at_most_three_times(): void
    {
        $ada = $this->user('Ada Obi', 20);
        $fan = $this->user('Big Spender');
        foreach (range(1, 6) as $i) $this->gift($ada, $fan, 100, '2026-10-20 08:00');

        $e = $this->getJson('/api/v1/leaderboard?month=10')->json('board.entries.0');
        $this->assertSame(3, $e['gifts']);
        $this->assertSame(1, $e['gifters']);
    }

    public function test_your_rank_needs_sign_in_and_shows_next_target(): void
    {
        $me = $this->user('Seun Adeleke', 19);
        $fan = $this->user('Fan');
        foreach (['A', 'B', 'C', 'D'] as $i => $n) {
            $p = $this->user("Person {$n}", 16);
            foreach (range(0, 4 - $i) as $k) $this->gift($p, $this->user("G{$n}{$k}"), 100, '2026-10-16 10:00');
        }
        $this->gift($me, $fan, 100, '2026-10-19 10:00');

        $this->getJson('/api/v1/leaderboard')->assertOk()->assertJson(['me' => null, 'signed_in' => false]);

        $mine = $this->actingAs($me, 'sanctum')->getJson('/api/v1/leaderboard')->json('me');
        $this->assertSame(5, $mine['rank']);
        $this->assertSame(1, $mine['gifts']);
        $this->assertSame(['top' => 3, 'gifts' => 3], $mine['target']);
        $this->assertSame(2, $mine['above']['gifts_ahead']);
        $this->assertSame('Person', $mine['above']['name']);
        $this->assertSame(4, $mine['above']['rank']);
        $this->assertSame('live', $mine['phase']);
    }

    public function test_birthday_is_set_once_then_locked_and_hidden_people_are_not_listed(): void
    {
        $me = $this->user('Tolu Ade');
        $this->actingAs($me, 'sanctum')->postJson('/api/v1/me/birthday', ['birth_day' => 31, 'birth_month' => 2])
            ->assertStatus(422);
        $this->actingAs($me, 'sanctum')->postJson('/api/v1/me/birthday', ['birth_day' => 22, 'birth_month' => 10, 'city' => 'Lagos', 'shown' => false])
            ->assertOk()->assertJsonPath('me.shown', false);

        // Trying to move it later does nothing.
        $this->actingAs($me, 'sanctum')->postJson('/api/v1/me/birthday', ['birth_day' => 1, 'birth_month' => 12, 'shown' => false])->assertOk();
        $me->refresh();
        $this->assertSame([22, 10, 'Lagos'], [$me->birth_day, $me->birth_month, $me->city]);

        $this->gift($me, $this->user('Fan'), 1000, '2026-10-22 10:00');
        $this->getJson('/api/v1/leaderboard?month=10')->assertJsonPath('board.total', 0);
    }

    public function test_website_page_and_todays_birthdays(): void
    {
        $today = $this->user('Birthday Today', 20);
        $other = $this->user('Other Day', 12);
        $this->gift($today, $this->user('F1'), 1000, '2026-10-20 08:00');
        $this->gift($other, $this->user('F2'), 1000, '2026-10-12 08:00');

        $this->get('/leaderboard')->assertOk();
        $this->assertSame(['Birthday Today'], array_column($this->getJson('/api/v1/leaderboard?today=1')->json('board.entries'), 'name'));
    }
}
