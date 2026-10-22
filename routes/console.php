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
