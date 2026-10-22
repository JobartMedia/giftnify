<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PromoCode extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'code',
        'percent_off',
        'max_uses',
        'uses',
        'active',
        'expires_at',
    ];

    protected $casts = [
        'active' => 'boolean',
        'expires_at' => 'datetime',
    ];

    public function isValid(): bool
    {
        if (!$this->active) return false;
        if ($this->expires_at && $this->expires_at->isPast()) return false;
        if ($this->max_uses !== null && $this->uses >= $this->max_uses) return false;
        return true;
    }
}
