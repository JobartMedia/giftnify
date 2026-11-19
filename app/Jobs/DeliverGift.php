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
 * Never reveals the sender or the exact value. Retries with backoff.
 *
 * Scheduled gifts ("Birthday Bomb") get two messages: a teaser now
 * ("Something is coming… unlocks at 12:00 AM") and the gift itself when it
 * unlocks, sent by the `giftnify:release-scheduled` command (every minute).
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
        $teaser = $gift->valueTeaser();

        // Scheduled: the teaser goes now; the gift itself when it unlocks.
        if ($gift->isLocked()) {
            if (!$gift->teaser_sent_at) {
                $when = $gift->unlock_at->copy()->setTimezone(config('app.display_timezone', 'Africa/Lagos'))->format('D j M, g:i A');
                if ($gift->delivery === 'Email') {
                    DeliveryService::sendEmail($gift->recipient_contact, 'Something is coming…', 'emails.teaser', [
                        'name' => $name, 'occasion' => $gift->occasion, 'when' => $when, 'teaser' => $teaser, 'link' => $link,
                    ]);
                } else {
                    DeliveryService::sendText($gift->delivery, $gift->recipient_contact,
                        "Hi {$name}, something is coming… Someone scheduled a mystery gift for you on Giftnify. It unlocks {$when}." .
                        ($teaser ? " {$teaser}" : '') . " Watch the countdown: {$link}");
                }
                $gift->update(['teaser_sent_at' => now(), 'delivery_status' => 'scheduled', 'delivery_error' => null]);
            }
            return;
        }

        $creatorGift = (bool)$gift->recipient_user_id;
        if ($gift->delivery === 'Email') {
            DeliveryService::sendEmail($gift->recipient_contact, $creatorGift ? 'Someone just Giftnified you' : 'You got a mystery gift', 'emails.gift', [
                'name' => $name,
                'occasion' => $gift->occasion,
                'hint' => $gift->reveal_mode === 'guess' ? null : $gift->sender_hint,
                'game' => $gift->reveal_mode === 'guess',
                'teaser' => $teaser,
                'link' => $link,
            ]);
        } else {
            $hint = $gift->reveal_mode === 'guess'
                ? ' Can you guess who sent it? You get 3 tries.'
                : ($gift->sender_hint ? " Hint: {$gift->sender_hint}" : '');
            DeliveryService::sendText($gift->delivery, $gift->recipient_contact,
                "Hi {$name}, someone sent you a mystery gift on Giftnify." . ($teaser ? " {$teaser}" : '') . "{$hint} Open it here: {$link}");
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
