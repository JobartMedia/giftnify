<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class BirthdayContactsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::create(2026, 11, 20, 9, 0, 0, 'Africa/Lagos'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function user(string $name, array $extra = []): User
    {
        return User::create(array_merge(['name' => $name, 'email' => strtolower(str_replace(' ', '.', $name)) . '@example.com',
            'password' => Hash::make('a-long-password'), 'role' => 'user'], $extra));
    }

    public function test_website_sign_up_needs_a_birthday_and_saves_it_locked(): void
    {
        $base = ['name' => 'Ada Obi', 'email' => 'ada@example.com', 'password' => 'a-long-password', 'password_confirmation' => 'a-long-password'];
        $this->post('/register', $base)->assertSessionHasErrors(['birth_day', 'birth_month']);
        $this->post('/register', $base + ['birth_day' => 30, 'birth_month' => 2])->assertSessionHasErrors('birth_day');

        $this->post('/register', $base + ['birth_day' => 27, 'birth_month' => 11, 'phone' => '0803 555 0142'])
            ->assertRedirect('/occasions?welcome=1');
        $u = User::where('email', 'ada@example.com')->first();
        $this->assertSame([27, 11, '8035550142'], [$u->birth_day, $u->birth_month, $u->phone_key]);
        $this->assertNotNull($u->birthday_set_at);
    }

    public function test_app_sign_up_accepts_birthday_and_phone(): void
    {
        $this->postJson('/api/v1/auth/register', ['name' => 'Kemi', 'email' => 'kemi@example.com', 'password' => 'a-long-password', 'birth_day' => 4, 'birth_month' => 12, 'phone' => '+2348091112222'])
            ->assertCreated()->assertJsonPath('user.birthday.birth_month', 12);
    }

    public function test_a_saved_contact_who_is_on_giftnify_shows_their_birthday_unless_hidden(): void
    {
        $me = $this->user('Seun Balogun');
        $ada = $this->user('Ada Obi', ['phone' => '+234 803 555 0142', 'birth_day' => 27, 'birth_month' => 11]);
        $this->user('Private Pat', ['email' => 'pat@example.com', 'birth_day' => 22, 'birth_month' => 11, 'birthday_visible' => false]);

        $this->actingAs($me, 'sanctum')->postJson('/api/v1/contacts/import', ['source' => 'phone', 'contacts' => [
            ['name' => 'Ada', 'phone' => '0803-555-0142'],
            ['name' => 'Pat', 'email' => 'PAT@example.com'],
            ['name' => 'Mum', 'phone' => '08091234567', 'birth_day' => 25, 'birth_month' => 11],
            ['name' => 'Mum again', 'phone' => '+234 809 123 4567'],
            ['name' => 'No contact'],
        ]])->assertOk()->assertJson(['added' => 3, 'skipped' => 2]);

        $people = collect($this->actingAs($me, 'sanctum')->getJson('/api/v1/contacts')->json())->keyBy('name');
        $this->assertSame(['2000-11-27', 'giftnify', true, 7], [$people['Ada']['remind_date'], $people['Ada']['date_source'], $people['Ada']['on_giftnify'], $people['Ada']['days']]);
        $this->assertNull($people['Pat']['remind_date']);
        $this->assertTrue($people['Pat']['on_giftnify']);
        $this->assertSame(['saved', 5], [$people['Mum']['date_source'], $people['Mum']['days']]);
        $this->assertStringNotContainsString('ada.obi@example.com', json_encode($people));
    }

    public function test_reminders_go_out_seven_days_and_one_day_before_once(): void
    {
        Mail::fake();
        config(['services.email_delivery' => true]);
        $me = $this->user('Seun Balogun');
        $off = $this->user('No Reminders', ['birthday_reminders' => false]);
        foreach ([$me, $off] as $u) {
            Contact::create(['user_id' => $u->id, 'name' => 'Ada Obi', 'email' => 'ada@x.com', 'occasion' => 'Birthday', 'occasion_date' => '2000-11-27']);
            Contact::create(['user_id' => $u->id, 'name' => 'Tunde', 'phone' => '08030000000', 'occasion' => 'Birthday', 'occasion_date' => '1990-11-21']);
            Contact::create(['user_id' => $u->id, 'name' => 'Later', 'phone' => '08030000001', 'occasion' => 'Birthday', 'occasion_date' => '1990-12-25']);
        }

        $this->artisan('giftnify:birthday-reminders')->expectsOutput('Sent 1 birthday reminder email(s).');
        $this->assertSame(2, \DB::table('birthday_reminder_log')->count());
        $this->artisan('giftnify:birthday-reminders')->expectsOutput('Sent 0 birthday reminder email(s).');
    }

    public function test_reminder_link_prefills_a_gift_that_opens_on_the_day(): void
    {
        $me = $this->user('Seun Balogun');
        Contact::create(['user_id' => $me->id, 'name' => 'Ada Obi', 'email' => 'ada@x.com', 'occasion' => 'Birthday', 'occasion_date' => '2000-11-27']);
        $p = \App\Services\BirthdayBook::people($me)->first();
        $link = \App\Services\BirthdayBook::giftLink($p);
        $this->assertStringContainsString('opens=2026-11-27', $link);
        $this->assertStringContainsString('contact=ada%40x.com', $link);

        $this->actingAs($me)->get(parse_url($link, PHP_URL_PATH) . '?' . parse_url($link, PHP_URL_QUERY))->assertOk()
            ->assertInertia(fn ($page) => $page->where('preselected.opens', '2026-11-27')->where('preselected.contact', 'ada@x.com'));
    }
}
