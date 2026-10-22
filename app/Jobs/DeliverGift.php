<?php

namespace App\Jobs;

use App\Models\Gift;
use App\Services\DeliveryService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Sends the sealed gift link to the recipient after payment is confirmed.
 * Never reveals the sender or the value. Retries with backoff.
 */
class DeliverGift implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    public function __construct(public string $token)
    {
    }

    public function backoff(): array
    {
        return [30, 120, 600, 1800];
    }

    public function handle(): void
    {
        $gift = Gift::where('token', $this->token)->first();
        if (!$gift || $gift->status === 'Awaiting Payment' || $gift->delivery_status === 'sent') {
            return;
        }

        if ($gift->delivery === 'Link' || !$gift->recipient_contact) {
            $gift->update(['delivery_status' => 'manual']);
            return;
        }

        $link = route('reveal.show', ['token' => $gift->token]);
        $name = trim(explode(' ', (string)$gift->recipient_name)[0]) ?: 'there';

        if ($gift->delivery === 'Email') {
            DeliveryService::sendEmail($gift->recipient_contact, 'You got a mystery gift', 'emails.gift', [
                'name' => $name,
                'occasion' => $gift->occasion,
                'hint' => $gift->sender_hint,
                'link' => $link,
            ]);
        } else {
            $hint = $gift->sender_hint ? " Hint: {$gift->sender_hint}" : '';
            DeliveryService::sendText($gift->delivery, $gift->recipient_contact,
                "Hi {$name}, someone sent you a mystery gift on Giftnify.{$hint} Open it here: {$link}");
        }

        $gift->update(['delivery_status' => 'sent', 'delivered_at' => now(), 'delivery_error' => null]);
    }

    public function failed(\Throwable $e): void
    {
        Gift::where('token', $this->token)->update([
            'delivery_status' => 'failed',
            'delivery_error' => mb_substr($e->getMessage(), 0, 250),
        ]);
    }
}
