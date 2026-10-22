<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Gift extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'token',
        'sender_id',
        'recipient_user_id',
        'sender_name',
        'recipient_name',
        'recipient_contact',
        'occasion',
        'relationship',
        'sender_hint',
        'message_type',
        'message_text',
        'media_path',
        'currency',
        'amount',
        'item',
        'delivery',
        'delivery_status',
        'delivered_at',
        'delivery_error',
        'status',
        'expires_at',
        'redeemed_at',
        'revealed_at',
        'reply_text',
        'reply_media_path',
        'replied_at',
        'claimed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'expires_at' => 'datetime',
        'redeemed_at' => 'datetime',
        'revealed_at' => 'datetime',
        'replied_at' => 'datetime',
        'claimed_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function payment()
    {
        return $this->hasOne(Payment::class, 'gift_token', 'token');
    }

    public function redemption()
    {
        return $this->hasOne(GiftRedemption::class, 'gift_token', 'token');
    }

    /**
     * Generate cryptographically random, uniform token without modulo bias.
     */
    public static function generateSecureToken(int $length = 12): string
    {
        $charset = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $chars = [];
        while (count($chars) < $length) {
            $bytes = random_bytes(($length - count($chars)) * 2);
            for ($i = 0; $i < strlen($bytes); $i++) {
                $b = ord($bytes[$i]);
                if ($b < 224) { // 56 * 4 = 224 (uniform rejection sampling)
                    $chars[] = $charset[$b % 56];
                    if (count($chars) === $length) {
                        break;
                    }
                }
            }
        }
        return implode('', $chars);
    }
}
