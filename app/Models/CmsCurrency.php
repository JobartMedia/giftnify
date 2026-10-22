<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CmsCurrency extends Model
{
    protected $primaryKey = 'code';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'code',
        'symbol',
        'name',
        'per_usd',
        'decimals',
        'active',
    ];

    protected $casts = [
        'per_usd' => 'decimal:6',
        'decimals' => 'integer',
        'active' => 'boolean',
    ];
}
