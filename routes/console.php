<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
 | Create or promote a staff account. Staff are never created by signing up.
 |   php artisan giftnify:make-admin you@company.com --role=admin
 */
Artisan::command('giftnify:make-admin {email} {--name=} {--role=admin}', function (string $email) {
    $role = $this->option('role');
    if (!in_array($role, ['admin', 'support', 'finance'], true)) {
        $this->error('Role must be admin, support or finance.');
        return 1;
    }

    $user = \App\Models\User::where('email', strtolower($email))->first();
    if (!$user) {
        $password = $this->secret('Password for the new account (min 12 characters)');
        if (strlen((string)$password) < 12) {
            $this->error('Use at least 12 characters.');
            return 1;
        }
        $user = \App\Models\User::create([
            'name' => $this->option('name') ?: explode('@', $email)[0],
            'email' => strtolower($email),
            'password' => \Illuminate\Support\Facades\Hash::make($password),
            'role' => $role,
        ]);
        $this->info("Created {$role} account for {$user->email}.");
    } else {
        $user->update(['role' => $role]);
        $this->info("{$user->email} is now {$role}.");
    }
    return 0;
})->purpose('Create or promote a Giftnify staff account');

/*
 | Scheduled gifts: when a gift's unlock time arrives, send the real "your gift
 | is here" message. Runs every minute from the scheduler (see DEPLOY.md cron).
 */
Artisan::command('giftnify:release-scheduled', function () {
    $due = \App\Models\Gift::where('delivery_status', 'scheduled')
        ->whereNotNull('unlock_at')->where('unlock_at', '<=', now())
        ->whereNotIn('status', ['Awaiting Payment', 'Cancelled', 'Refunded'])
        ->limit(200)->pluck('token');
    foreach ($due as $token) {
        \App\Jobs\DeliverGift::dispatch($token);
    }
    $this->info("Released {$due->count()} scheduled gift(s).");
})->purpose('Send scheduled gifts whose unlock time has arrived');

\Illuminate\Support\Facades\Schedule::command('giftnify:release-scheduled')->everyMinute()->withoutOverlapping();

/*
 | Birthday reminders: each morning, email people about the birthdays of the
 | people they've saved, 7 days before and the day before. One email per
 | person per day, never the same reminder twice.
 */
Artisan::command('giftnify:birthday-reminders', function () {
    $today = \Carbon\CarbonImmutable::now(\App\Services\BirthdayBook::TZ)->startOfDay();
    $leads = \App\Services\BirthdayBook::LEADS;
    $sent = 0;

    \App\Models\User::where(fn ($q) => $q->whereNull('birthday_reminders')->orWhere('birthday_reminders', true))
        ->where(fn ($q) => $q->whereNull('status')->orWhere('status', 'active'))
        ->whereHas('contacts')
        ->chunkById(200, function ($users) use ($today, $leads, &$sent) {
            foreach ($users as $user) {
                $due = \App\Services\BirthdayBook::upcoming($user, max($leads))
                    ->filter(fn ($p) => in_array($p['days'], $leads, true))
                    ->reject(fn ($p) => \DB::table('birthday_reminder_log')->where('contact_id', $p['id'])
                        ->where('occurs_on', $p['next_date'])->where('lead_days', $p['days'])->exists())
                    ->values();
                if ($due->isEmpty()) continue;

                $people = $due->map(fn ($p) => $p + [
                    'when' => $p['days'] === 1 ? 'tomorrow' : "in {$p['days']} days",
                    'link' => \App\Services\BirthdayBook::giftLink($p),
                ])->all();
                $first = $people[0];
                $headline = count($people) === 1
                    ? "{$first['first']}'s " . strtolower($first['occasion']) . " is {$first['when']}"
                    : count($people) . ' birthdays are coming up';

                try {
                    \App\Services\DeliveryService::sendEmail($user->email, $headline, 'emails.birthday-reminder', [
                        'name' => explode(' ', trim($user->name))[0], 'headline' => $headline, 'people' => $people,
                        'settings' => url('/occasions#settings'),
                    ]);
                } catch (\Throwable $e) {
                    report($e);
                    continue;
                }
                foreach ($due as $p) {
                    \DB::table('birthday_reminder_log')->insertOrIgnore([
                        'user_id' => $user->id, 'contact_id' => $p['id'], 'occurs_on' => $p['next_date'],
                        'lead_days' => $p['days'], 'sent_at' => now(),
                    ]);
                }
                $sent++;
            }
        });
    $this->info("Sent {$sent} birthday reminder email(s).");
})->purpose('Email people before the birthdays of the people they saved');

\Illuminate\Support\Facades\Schedule::command('giftnify:birthday-reminders')
    ->dailyAt('08:00')->timezone('Africa/Lagos')->withoutOverlapping();
