<?php

namespace App\Services;

use App\Models\CmsSetting;
use Illuminate\Support\Facades\Crypt;

/**
 * Google sign-in keys entered in Admin → Google. Stored encrypted (APP_KEY) in
 * cms_settings and override .env at boot. The browser only ever sees the last 4.
 */
class GoogleSettings
{
    public const SETTING = 'google_keys';

    public const FIELDS = [
        'client_id' => ['label' => 'OAuth client ID', 'pattern' => '/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/', 'secret' => false],
        'client_secret' => ['label' => 'OAuth client secret', 'pattern' => '/^[A-Za-z0-9_\-]{20,}$/', 'secret' => true],
    ];

    public static function apply(): void
    {
        try {
            $stored = (array)(CmsSetting::get(self::SETTING, []) ?? []);
        } catch (\Throwable) {
            return;
        }
        foreach (self::FIELDS as $key => $_) {
            if (!empty($stored[$key])) {
                try {
                    config(["services.google.{$key}" => Crypt::decryptString($stored[$key])]);
                } catch (\Throwable) {
                    // APP_KEY changed: re-enter in the console.
                }
            }
        }
    }

    public static function configured(): bool
    {
        return (string)config('services.google.client_id') !== '' && (string)config('services.google.client_secret') !== '';
    }

    public static function status(): array
    {
        $stored = (array)(CmsSetting::get(self::SETTING, []) ?? []);
        $fields = [];
        foreach (self::FIELDS as $key => $meta) {
            $value = (string)config("services.google.{$key}");
            $fields[$key] = [
                'label' => $meta['label'],
                'set' => $value !== '',
                'source' => !empty($stored[$key]) ? 'console' : ($value !== '' ? 'env' : null),
                'ending' => $value !== '' ? ($meta['secret'] ? substr($value, -4) : $value) : null,
            ];
        }
        return [
            'fields' => $fields,
            'redirect_uri' => route('google.callback'),
            'origin' => rtrim(url('/'), '/'),
            'connected_users' => \App\Models\GoogleConnection::count(),
        ];
    }

    /** Saves non-empty fields; returns errors by field. */
    public static function save(array $input, array $clear = []): array
    {
        $stored = (array)(CmsSetting::get(self::SETTING, []) ?? []);
        $errors = [];
        foreach (self::FIELDS as $key => $meta) {
            if (in_array($key, $clear, true)) {
                unset($stored[$key]);
                continue;
            }
            $value = trim((string)($input[$key] ?? ''));
            if ($value === '') continue;
            if (!preg_match($meta['pattern'], $value)) {
                $errors[$key] = $key === 'client_id'
                    ? 'That doesn\'t look like a Google client ID (it ends in .apps.googleusercontent.com).'
                    : 'That doesn\'t look like a Google client secret.';
                continue;
            }
            $stored[$key] = Crypt::encryptString($value);
        }
        if (!$errors) {
            CmsSetting::updateOrCreate(['key' => self::SETTING], ['value' => $stored]);
            self::apply();
        }
        return $errors;
    }
}
