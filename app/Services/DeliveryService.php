<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Validation, and the actual sending, for every channel a gift can travel by.
 * Channels are offered to senders only when they are really configured.
 */
class DeliveryService
{
    public static function normalizePhone(string $phone): string
    {
        return preg_replace('/[\s().-]/', '', $phone);
    }

    /** Channels a sender can pick right now. Link always works. */
    public static function availableChannels(): array
    {
        $channels = [];
        if (self::termiiReady() && config('services.termii.whatsapp_device')) $channels[] = 'WhatsApp';
        if (self::termiiReady()) $channels[] = 'SMS';
        if (config('services.email_delivery')) $channels[] = 'Email';
        $channels[] = 'Link';
        return $channels;
    }

    public static function termiiReady(): bool
    {
        return !empty(config('services.termii.key'));
    }

    public static function validate(string $channel, ?string $contact): ?string
    {
        $contact = trim((string)$contact);

        if (!in_array($channel, self::availableChannels(), true)) {
            return "{$channel} delivery isn't available yet. Choose another way to send it.";
        }

        if ($channel === 'Link') {
            return null;
        }

        if ($channel === 'Email') {
            if (empty($contact)) {
                return "Add the recipient's email address.";
            }
            if (!filter_var($contact, FILTER_VALIDATE_EMAIL) || strlen($contact) > 254) {
                return 'Enter a valid email, like name@example.com.';
            }
            return null;
        }

        if ($channel === 'WhatsApp' || $channel === 'SMS') {
            if (empty($contact)) {
                return "Add the recipient's phone number for {$channel}.";
            }
            $clean = self::normalizePhone($contact);
            if (!preg_match('/^\+[1-9]\d{7,14}$/', $clean)) {
                return 'Use the full number with country code, like +234 803 555 0142.';
            }
            return null;
        }

        return 'Choose how to deliver the gift.';
    }

    public static function normalizeContact(string $channel, ?string $contact): ?string
    {
        $contact = trim((string)$contact);
        if ($channel === 'Link') {
            return $contact ?: null;
        }
        if ($channel === 'Email') {
            return strtolower($contact);
        }
        return self::normalizePhone($contact);
    }

    /** Masks a phone or email for display: ••••0142 / t•••@gmail.com */
    public static function mask(?string $contact): string
    {
        $c = (string)$contact;
        if (str_contains($c, '@')) {
            [$u, $d] = explode('@', $c, 2);
            return mb_substr($u, 0, 1) . '•••@' . $d;
        }
        return '••••' . substr($c, -4);
    }

    /**
     * Sends a short text by SMS or WhatsApp through Termii.
     * Throws on failure so queued jobs retry.
     */
    public static function sendText(string $channel, string $to, string $message): void
    {
        if (!self::termiiReady()) {
            throw new \RuntimeException('SMS/WhatsApp provider is not configured.');
        }

        $isWhatsApp = $channel === 'WhatsApp';
        $response = Http::timeout(15)->post(config('services.termii.base_url') . '/api/sms/send', [
            'api_key' => config('services.termii.key'),
            'to' => ltrim(self::normalizePhone($to), '+'),
            'from' => $isWhatsApp ? config('services.termii.whatsapp_device') : config('services.termii.sender_id'),
            'sms' => $message,
            'type' => 'plain',
            'channel' => $isWhatsApp ? 'whatsapp' : 'dnd', // dnd = transactional route
        ]);

        if (!$response->successful() || ($response->json('code') && $response->json('code') !== 'ok')) {
            Log::warning('Termii send failed', ['status' => $response->status(), 'body' => mb_substr($response->body(), 0, 300)]);
            throw new \RuntimeException('Message provider rejected the message.');
        }
    }

    /** Sends a plain-text + HTML email using the app's mailer. */
    public static function sendEmail(string $to, string $subject, string $view, array $data): void
    {
        if (!config('services.email_delivery')) {
            throw new \RuntimeException('Email provider is not configured.');
        }
        Mail::send(['html' => $view], $data, function ($m) use ($to, $subject) {
            $m->to($to)->subject($subject);
        });
    }
}
