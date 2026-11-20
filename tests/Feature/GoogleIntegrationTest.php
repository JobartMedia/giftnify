<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\GoogleConnection;
use App\Models\User;
use App\Services\GoogleService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GoogleIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::create(2026, 11, 20, 9, 0, 0, 'Africa/Lagos'));
        config(['services.google.client_id' => '123-abc.apps.googleusercontent.com', 'services.google.client_secret' => 'GOCSPX-abcdefghijklmnopqrstuv']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function user(): User
    {
        return User::create(['name' => 'Seun Balogun', 'email' => 'seun@example.com', 'password' => Hash::make('a-long-password'), 'role' => 'user']);
    }

    private function idToken(string $email): string
    {
        return 'h.' . rtrim(strtr(base64_encode(json_encode(['email' => $email])), '+/', '-_'), '=') . '.s';
    }

    public function test_connect_redirects_to_google_and_callback_saves_encrypted_tokens(): void
    {
        $me = $this->user();
        $res = $this->actingAs($me)->get('/integrations/google/connect?want=both');
        $url = $res->headers->get('Location');
        $this->assertStringStartsWith('https://accounts.google.com/o/oauth2/v2/auth?', $url);
        $this->assertStringContainsString(urlencode(GoogleConnection::CONTACTS), $url);
        $this->assertStringContainsString(urlencode(GoogleConnection::CALENDAR), $url);
        parse_str(parse_url($url, PHP_URL_QUERY), $q);

        Http::fake([
            'oauth2.googleapis.com/token' => Http::response(['access_token' => 'ya29.x', 'refresh_token' => '1//r', 'expires_in' => 3600,
                'scope' => 'openid email ' . GoogleConnection::CONTACTS . ' ' . GoogleConnection::CALENDAR, 'id_token' => $this->idToken('seun@gmail.com')]),
            'www.googleapis.com/calendar/v3/calendars' => Http::response(['id' => 'cal123@group.calendar.google.com']),
            'www.googleapis.com/calendar/v3/calendars/*/events*' => Http::response(['items' => []]),
        ]);

        $this->actingAs($me)->get('/integrations/google/callback?code=abc&state=' . urlencode($q['state']))
            ->assertRedirect('/occasions?google=contacts');

        $conn = GoogleConnection::first();
        $this->assertSame(['seun@gmail.com', true, true], [$conn->google_email, $conn->has(GoogleConnection::CONTACTS), $conn->calendar_enabled]);
        $this->assertSame('cal123@group.calendar.google.com', $conn->calendar_id);
        $raw = \DB::table('google_connections')->value('refresh_token');
        $this->assertStringNotContainsString('1//r', $raw);
    }

    public function test_someone_elses_state_is_refused(): void
    {
        $me = $this->user();
        $other = User::create(['name' => 'Other', 'email' => 'o@example.com', 'password' => Hash::make('a-long-password'), 'role' => 'user']);
        parse_str(parse_url(GoogleService::authUrl($other, ['contacts']), PHP_URL_QUERY), $q);
        Http::fake();
        $this->actingAs($me)->get('/integrations/google/callback?code=abc&state=' . urlencode($q['state']))->assertRedirect('/occasions');
        $this->assertSame(0, GoogleConnection::count());
        Http::assertNothingSent();
    }

    public function test_google_contacts_come_back_with_birthdays_for_review(): void
    {
        $me = $this->user();
        GoogleConnection::create(['user_id' => $me->id, 'scopes' => 'openid ' . GoogleConnection::CONTACTS, 'access_token' => 'ya29.x', 'expires_at' => now()->addHour()]);
        Http::fake(['people.googleapis.com/*' => Http::response(['connections' => [
            ['names' => [['displayName' => 'Ada Obi']], 'phoneNumbers' => [['value' => '0803 555 0142', 'canonicalForm' => '+2348035550142']], 'birthdays' => [['date' => ['month' => 11, 'day' => 27]]]],
            ['names' => [['displayName' => 'No Number']]],
            ['names' => [['displayName' => 'Tunde']], 'emailAddresses' => [['value' => 'Tunde@Example.com']]],
        ]])]);

        $this->actingAs($me, 'sanctum')->getJson('/api/v1/integrations/google/contacts')->assertOk()
            ->assertJsonCount(2, 'contacts')
            ->assertJsonPath('contacts.0', ['name' => 'Ada Obi', 'phone' => '+2348035550142', 'email' => null, 'birth_day' => 27, 'birth_month' => 11])
            ->assertJsonPath('contacts.1.email', 'tunde@example.com');
    }

    public function test_calendar_sync_adds_yearly_events_with_reminders_and_removes_deleted_people(): void
    {
        $me = $this->user();
        $conn = GoogleConnection::create(['user_id' => $me->id, 'scopes' => 'openid ' . GoogleConnection::CALENDAR, 'access_token' => 'old', 'refresh_token' => '1//r',
            'expires_at' => now()->subMinute(), 'calendar_enabled' => true, 'calendar_id' => 'cal1']);
        $ada = Contact::create(['user_id' => $me->id, 'name' => 'Ada Obi', 'email' => 'ada@x.com', 'occasion' => 'Birthday', 'occasion_date' => '2000-11-27']);
        Contact::create(['user_id' => $me->id, 'name' => 'No Date', 'email' => 'nd@x.com', 'occasion' => 'Birthday']);

        Http::fake([
            'oauth2.googleapis.com/token' => Http::response(['access_token' => 'fresh', 'expires_in' => 3600]),
            'www.googleapis.com/calendar/v3/calendars/cal1/events?*' => Http::response(['items' => [['id' => 'gnstale0000']]]),
            'www.googleapis.com/calendar/v3/calendars/cal1/events' => Http::response(['id' => 'x']),
            'www.googleapis.com/calendar/v3/calendars/cal1/events/*' => Http::response([], 204),
            'www.googleapis.com/calendar/v3/calendars/cal1' => Http::response(['id' => 'cal1']),
        ]);

        $this->assertSame(1, GoogleService::syncCalendar($conn));

        Http::assertSent(function (HttpRequest $r) use ($ada) {
            if ($r->method() !== 'POST' || !str_ends_with($r->url(), '/calendars/cal1/events')) return false;
            $b = $r->data();
            return $r->hasHeader('Authorization', 'Bearer fresh')
                && $b['id'] === GoogleService::eventId($ada->id)
                && $b['start'] === ['date' => '2026-11-27'] && $b['recurrence'] === ['RRULE:FREQ=YEARLY']
                && str_contains($b['summary'], "Ada Obi's birthday")
                && collect($b['reminders']['overrides'])->pluck('minutes')->all() === [9540, 900];
        });
        Http::assertSent(fn (HttpRequest $r) => $r->method() === 'DELETE' && str_ends_with($r->url(), '/events/gnstale0000'));
        $this->assertSame(1, $conn->fresh()->calendar_events);
    }

    public function test_app_gets_a_signed_link_that_signs_in_and_goes_to_google(): void
    {
        $me = $this->user();
        $url = $this->actingAs($me, 'sanctum')->postJson('/api/v1/integrations/google/link', ['want' => 'calendar'])->assertOk()->json('url');
        $this->get(substr($url, strlen(url('/'))))->assertRedirectContains('accounts.google.com');
        $this->assertAuthenticatedAs($me, 'web');
        $this->get('/integrations/google/app/' . $me->id . '?want=calendar')->assertForbidden();
    }

    public function test_follow_up_the_day_after_when_no_gift_was_sent(): void
    {
        config(['services.email_delivery' => true]);
        $me = $this->user();
        Contact::create(['user_id' => $me->id, 'name' => 'Ada Obi', 'email' => 'ada@x.com', 'occasion' => 'Birthday', 'occasion_date' => '2000-11-19']);
        Contact::create(['user_id' => $me->id, 'name' => 'Gifted Gina', 'email' => 'gina@x.com', 'occasion' => 'Birthday', 'occasion_date' => '2000-11-19']);
        \App\Models\Gift::create(['token' => \App\Models\Gift::generateSecureToken(12), 'sender_id' => $me->id, 'sender_name' => 'Seun',
            'recipient_name' => 'Gina', 'recipient_contact' => 'gina@x.com', 'occasion' => 'Birthday', 'message_type' => 'text',
            'message_text' => 'HBD', 'currency' => 'NGN', 'amount' => 2000, 'delivery' => 'Email', 'status' => 'Sent', 'expires_at' => now()->addDays(90)]);

        $this->assertSame(['Ada Obi'], \App\Services\BirthdayBook::missedYesterday($me)->pluck('name')->all());
        $this->artisan('giftnify:birthday-reminders')->expectsOutput('Sent 1 birthday reminder email(s).');
        $this->artisan('giftnify:birthday-reminders')->expectsOutput('Sent 0 birthday reminder email(s).');
    }

    public function test_status_and_disconnect(): void
    {
        $me = $this->user();
        $this->actingAs($me, 'sanctum')->getJson('/api/v1/integrations/google')->assertJson(['available' => true, 'connected' => false]);
        GoogleConnection::create(['user_id' => $me->id, 'scopes' => 'openid ' . GoogleConnection::CALENDAR, 'access_token' => 'a', 'expires_at' => now()->addHour(), 'calendar_enabled' => true, 'calendar_id' => 'cal1']);
        Http::fake(['*' => Http::response([], 200)]);
        $this->actingAs($me, 'sanctum')->deleteJson('/api/v1/integrations/google')->assertJson(['connected' => false]);
        Http::assertSent(fn (HttpRequest $r) => $r->method() === 'DELETE' && str_ends_with($r->url(), '/calendars/cal1'));
        Http::assertSent(fn (HttpRequest $r) => str_contains($r->url(), 'oauth2.googleapis.com/revoke'));
        $this->assertSame(0, GoogleConnection::count());
    }
}
