<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasUuids;

    protected $fillable = [
        'actor_id',
        'action',
        'target',
        'details',
        'ip_address',
    ];

    protected $casts = [
        'details' => 'array',
    ];

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public static function record(string $action, ?string $target = null, ?array $details = null, ?string $actorId = null)
    {
        return static::create([
            'actor_id' => $actorId ?? auth()->id(),
            'action' => $action,
            'target' => $target,
            'details' => $details,
            'ip_address' => request()->ip(),
        ]);
    }
}
