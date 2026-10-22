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
    ];

    protected $casts = [
        'occasion_date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
