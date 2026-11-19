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
        'reveal_mode',
        'guess_hints',
        'guess_answers',
        'guess_attempts',
        'guess_result',
        'value_teaser',
        'unlock_at',
        'teaser_sent_at',
        'wall_note',
        'on_wall',
        'wall_hidden',
    ];

    protected $hidden = ['guess_answers'];

    protected $casts = [
        'amount' => 'decimal:2',
        'expires_at' => 'datetime',
        'redeemed_at' => 'datetime',
        'revealed_at' => 'datetime',
        'replied_at' => 'datetime',
        'claimed_at' => 'datetime',
        'delivered_at' => 'datetime',
        'guess_hints' => 'array',
        'guess_answers' => 'encrypted:array',
        'unlock_at' => 'datetime',
        'teaser_sent_at' => 'datetime',
        'on_wall' => 'boolean',
        'wall_hidden' => 'boolean',
    ];

    public const GUESS_TRIES = 3;

    /** Still counting down to its scheduled opening time? */
    public function isLocked(): bool
    {
        return $this->unlock_at !== null && $this->unlock_at->isFuture();
    }

    public function isAnonymous(): bool
    {
        return $this->reveal_mode === 'anonymous';
    }

    /** The name the recipient sees at the reveal. */
    public function revealedName(): string
    {
        if ($this->isAnonymous()) return 'Anonymous';
        return trim((string)$this->sender_name) ?: 'A friend';
    }

    /**
     * "It's a 5-figure gift": how big the gift is without the exact amount.
     * Null when the sender keeps the value a total mystery.
     */
    public function valueTeaser(): ?string
    {
        if ($this->value_teaser !== 'figures') return null;
        $digits = strlen((string)max(1, (int)floor((float)$this->amount)));
        $word = [1 => 'single-digit', 2 => '2-figure', 3 => '3-figure', 4 => '4-figure', 5 => '5-figure', 6 => '6-figure', 7 => '7-figure'][$digits] ?? 'very big';
        $symbol = ['NGN' => '₦', 'USD' => '$', 'GBP' => '£', 'EUR' => '€', 'CAD' => 'C$', 'GHS' => 'GH₵', 'KES' => 'KSh', 'ZAR' => 'R'][$this->currency] ?? $this->currency . ' ';
        return $this->item ? "It's not cash. It's something you'll love." : "It's a {$word} {$symbol} gift.";
    }

    public function recipientUser()
    {
        return $this->belongsTo(User::class, 'recipient_user_id');
    }

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
