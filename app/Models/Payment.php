<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'reference',
        'gift_token',
        'user_id',
        'provider',
        'provider_ref',
        'amount',
        'fee',
        'discount',
        'promo_code',
        'currency',
        'status',
        'paid_at',
        'refunded_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'fee' => 'decimal:2',
        'discount' => 'decimal:2',
        'paid_at' => 'datetime',
        'refunded_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function gift()
    {
        return $this->belongsTo(Gift::class, 'gift_token', 'token');
    }
}
