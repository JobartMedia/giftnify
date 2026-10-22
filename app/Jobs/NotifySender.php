<?php

namespace App\Jobs;

use App\Models\Gift;
use App\Services\DeliveryService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/** Emails the sender when their gift is opened, revealed or replied to. */
class NotifySender implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public string $token, public string $event)
    {
    }

    public function handle(): void
    {
        if (!config('services.email_delivery')) return;

        $gift = Gift::with('sender')->where('token', $this->token)->first();
        $email = $gift?->sender?->email;
        if (!$gift || !$email) return;

        $first = trim(explode(' ', (string)$gift->recipient_name)[0]);
        [$subject, $line] = match ($this->event) {
            'opened' => ["{$first} is opening your gift", "{$first} just started your message."],
            'revealed' => ["{$first} found out it was you", "{$first} watched your message and saw it was from you."],
            'replied' => ["{$first} replied to your gift", "{$first} sent you a reply. Open Giftnify to read or hear it."],
            default => [null, null],
        };
        if (!$subject) return;

        DeliveryService::sendEmail($email, $subject, 'emails.notice', [
            'line' => $line,
            'link' => route('gifts.index'),
            'cta' => $this->event === 'replied' ? 'See their reply' : 'See your gifts',
        ]);
    }
}
