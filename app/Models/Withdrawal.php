<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Withdrawal extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id', 'wallet_id', 'amount', 'currency', 'method', 'details',
        'status', 'failure_reason', 'processed_by', 'processed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'details' => 'encrypted:array', // bank and phone details are encrypted at rest
        'processed_at' => 'datetime',
    ];

    protected $hidden = ['details'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function wallet()
    {
        return $this->belongsTo(Wallet::class);
    }

    /** Safe summary for the owner's own wallet page (no full account numbers). */
    public function maskedDestination(): string
    {
        $d = $this->details ?? [];
        if ($this->method === 'Bank Transfer') {
            $acct = (string)($d['account'] ?? '');
            return trim(($d['bank'] ?? 'Bank') . ' ••' . substr($acct, -4));
        }
        $dest = (string)($d['destination'] ?? '');
        return strlen($dest) > 4 ? '••' . substr($dest, -4) : $dest;
    }
}
