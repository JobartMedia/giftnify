<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GiftRedemption extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'gift_token',
        'method',
        'details',
        'payout_status',
        'processed_at',
    ];

    protected $casts = [
        'details' => 'array',
        'processed_at' => 'datetime',
    ];

    public function gift()
    {
        return $this->belongsTo(Gift::class, 'gift_token', 'token');
    }
}
