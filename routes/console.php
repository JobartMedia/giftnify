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
