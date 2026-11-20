<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasUuids;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'preferred_currency',
        'avatar_url',
        'phone',
        'status',
        'username',
        'birth_month',
        'birth_day',
        'birthday_set_at',
        'leaderboard_opt_in',
        'birthday_visible',
        'birthday_reminders',
        'city',
        'country',
        'bio',
        'creator_enabled',
        'creator_currency',
        'creator_amounts',
        'creator_wall',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'creator_enabled' => 'boolean',
            'creator_amounts' => 'array',
            'creator_wall' => 'boolean',
            'birth_month' => 'integer',
            'birth_day' => 'integer',
            'birthday_set_at' => 'datetime',
            'leaderboard_opt_in' => 'boolean',
            'birthday_visible' => 'boolean',
            'birthday_reminders' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (User $u) {
            if ($u->isDirty('phone')) $u->phone_key = \App\Services\BirthdayBook::phoneKey($u->phone);
        });
    }

    public function gifts()
    {
        return $this->hasMany(Gift::class, 'sender_id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'user_id');
    }

    public function wallets()
    {
        return $this->hasMany(Wallet::class);
    }

    public function withdrawals()
    {
        return $this->hasMany(Withdrawal::class);
    }

    public function contacts()
    {
        return $this->hasMany(Contact::class, 'user_id');
    }

    public function isStaff(): bool
    {
        return in_array($this->role, ['admin', 'support', 'finance']);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isFinance(): bool
    {
        return in_array($this->role, ['admin', 'finance']);
    }
}
