<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/** Append-only ledger row. Never update or delete these. */
class WalletTransaction extends Model
{
    use HasUuids;

    protected $fillable = ['wallet_id', 'user_id', 'type', 'source', 'reference', 'amount', 'balance_after', 'description'];

    protected $casts = ['amount' => 'decimal:2', 'balance_after' => 'decimal:2'];

    public function wallet()
    {
        return $this->belongsTo(Wallet::class);
    }
}
