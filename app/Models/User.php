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
        ];
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
