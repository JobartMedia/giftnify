<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contact extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'name',
        'phone',
        'email',
        'occasion',
        'occasion_date',
        'source',
    ];

    protected $casts = [
        'occasion_date' => 'date',
    ];

    protected static function booted(): void
    {
        static::saving(function (Contact $c) {
            if ($c->isDirty('phone')) $c->phone_key = \App\Services\BirthdayBook::phoneKey($c->phone);
            if ($c->isDirty('email') && $c->email) $c->email = strtolower(trim($c->email));
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
