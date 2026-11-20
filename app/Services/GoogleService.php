<?php

namespace App\Services;

use App\Models\GoogleConnection;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;

/**
 * Google Contacts (read-only) and a "Giftnify Birthdays" calendar.
 *
 * Contacts: people come back for the person to tick, same as a phone import.
 * Calendar: one yearly all-day event per person with a date, with Google's own
 * reminders 7 days and 1 day before, and a link that starts a gift. Giftnify
 * only ever touches the calendar it created.
 */
class GoogleService
{
    private const AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
    private const TOKEN = 'https://oauth2.googleapis.com/token';
    private const REVOKE = 'https://oauth2.googleapis.com/revoke';
    private const PEOPLE = 'https://people.googleapis.com/v1/people/me/connections';
    private const CAL = 'https://www.googleapis.com/calendar/v3';
    public const CALENDAR_NAME = 'Giftnify Birthdays';

    /** Where to send the person to approve. $features: contacts and/or calendar. */
    public static function authUrl(User $user, array $features, string $return = 'web'): string
    {
        $scopes = ['openid', 'email'];
        if (in_array('contacts', $features, true)) $scopes[] = GoogleConnection::CONTACTS;
        if (in_array('calendar', $features, true)) $scopes[] = GoogleConnection::CALENDAR;

        $state = Crypt::encryptString(json_encode(['u' => $user->id, 'f' => array_values($features), 'r' => $return, 't' => time()]));

        return self::AUTH . '?' . http_build_query([
            'client_id' => config('services.google.client_id'),
            'redirect_uri' => route('google.callback'),
            'response_type' => 'code',
            'scope' => implode(' ', $scopes),
            'access_type' => 'offline',
            'include_granted_scopes' => 'true',
            'prompt' => 'consent',
            'state' => $state,
        ]);
    }

    /** @return array{u: string, f: array, r: string}|null */
    public static function readState(?string $state): ?array
    {
        try {
            $s = json_decode(Crypt::decryptString((string)$state), true);
        } catch (\Throwable) {
            return null;
        }
        return is_array($s) && isset($s['u'], $s['t']) && time() - (int)$s['t'] < 1800 ? $s : null;
    }

    /** Swap the code for tokens and save the connection. */
    public static function finish(User $user, string $code, array $features): GoogleConnection
    {
        $res = Http::asForm()->timeout(20)->post(self::TOKEN, [
            'code' => $code,
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'redirect_uri' => route('google.callback'),
            'grant_type' => 'authorization_code',
        ]);
        if (!$res->ok() || !$res->json('access_token')) {
            throw new \RuntimeException('Google did not accept the sign-in. Try again.');
        }

        $conn = GoogleConnection::firstOrNew(['user_id' => $user->id]);
        $granted = array_unique(array_filter(array_merge(explode(' ', (string)$conn->scopes), explode(' ', (string)$res->json('scope')))));
        $conn->fill([
            'google_email' => self::emailFromIdToken($res->json('id_token')) ?? $conn->google_email,
            'scopes' => implode(' ', $granted),
            'access_token' => $res->json('access_token'),
            'expires_at' => now()->addSeconds((int)$res->json('expires_in', 3500) - 60),
            'last_error' => null,
        ]);
        if ($res->json('refresh_token')) $conn->refresh_token = $res->json('refresh_token');
        if (in_array('calendar', $features, true) && $conn->has(GoogleConnection::CALENDAR)) $conn->calendar_enabled = true;
        $conn->save();
        return $conn;
    }

    private static function emailFromIdToken(?string $jwt): ?string
    {
        $parts = explode('.', (string)$jwt);
        if (count($parts) < 2) return null;
        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
        return is_array($payload) ? ($payload['email'] ?? null) : null;
    }

    /** A valid access token, refreshed when needed. */
    public static function token(GoogleConnection $conn): string
    {
        if ($conn->access_token && $conn->expires_at && $conn->expires_at->isFuture()) return $conn->access_token;
        if (!$conn->refresh_token) throw new \RuntimeException('Reconnect Google to keep syncing.');

        $res = Http::asForm()->timeout(20)->post(self::TOKEN, [
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'refresh_token' => $conn->refresh_token,
            'grant_type' => 'refresh_token',
        ]);
        if (!$res->ok() || !$res->json('access_token')) {
            $conn->update(['last_error' => 'Google access was removed. Reconnect to keep syncing.']);
            throw new \RuntimeException('Reconnect Google to keep syncing.');
        }
        $conn->update(['access_token' => $res->json('access_token'), 'expires_at' => now()->addSeconds((int)$res->json('expires_in', 3500) - 60)]);
        return $conn->access_token;
    }

    private static function api(GoogleConnection $conn)
    {
        return Http::withToken(self::token($conn))->acceptJson()->timeout(25);
    }

    /**
     * Everyone in Google Contacts with a phone or email, ready for the
     * tick-who-to-add list. Birthdays come along when they're saved.
     *
     * @return array<int, array{name: string, phone: ?string, email: ?string, birth_day: ?int, birth_month: ?int}>
     */
    public static function contacts(GoogleConnection $conn, int $max = 3000): array
    {
        if (!$conn->has(GoogleConnection::CONTACTS)) throw new \RuntimeException('Allow Giftnify to read your Google Contacts first.');
        $out = [];
        $page = null;
        do {
            $res = self::api($conn)->get(self::PEOPLE, array_filter([
                'personFields' => 'names,emailAddresses,phoneNumbers,birthdays',
                'pageSize' => 1000,
                'sortOrder' => 'FIRST_NAME_ASCENDING',
                'pageToken' => $page,
            ]));
            if (!$res->ok()) throw new \RuntimeException('Google Contacts did not respond. Try again in a minute.');
            foreach ((array)$res->json('connections', []) as $p) {
                $name = trim((string)($p['names'][0]['displayName'] ?? ''));
                $phone = $p['phoneNumbers'][0]['canonicalForm'] ?? $p['phoneNumbers'][0]['value'] ?? null;
                $email = $p['emailAddresses'][0]['value'] ?? null;
                if ($name === '' || (!$phone && !$email)) continue;
                $b = collect($p['birthdays'] ?? [])->first(fn ($x) => isset($x['date']['month'], $x['date']['day']));
                $out[] = [
                    'name' => mb_substr($name, 0, 80),
                    'phone' => $phone,
                    'email' => $email ? strtolower($email) : null,
                    'birth_day' => $b ? (int)$b['date']['day'] : null,
                    'birth_month' => $b ? (int)$b['date']['month'] : null,
                ];
            }
            $page = $res->json('nextPageToken');
        } while ($page && count($out) < $max);

        $conn->update(['contacts_imported_at' => now(), 'last_error' => null]);
        return $out;
    }

    /** The Giftnify Birthdays calendar, created the first time. */
    private static function calendarId(GoogleConnection $conn): string
    {
        if ($conn->calendar_id) {
            $res = self::api($conn)->get(self::CAL . '/calendars/' . rawurlencode($conn->calendar_id));
            if ($res->ok()) return $conn->calendar_id;
        }
        $res = self::api($conn)->post(self::CAL . '/calendars', [
            'summary' => self::CALENDAR_NAME,
            'description' => 'Birthdays of the people you saved on Giftnify, with reminders a week and a day before.',
            'timeZone' => BirthdayBook::TZ,
        ]);
        if (!$res->ok()) throw new \RuntimeException('Google Calendar did not let us create the Giftnify Birthdays calendar.');
        $conn->update(['calendar_id' => $res->json('id')]);
        return $conn->calendar_id;
    }

    /** Event ids must be base32hex (0-9, a-v): "gn" + the contact's uuid digits. */
    public static function eventId(string $contactId): string
    {
        return 'gn' . strtolower(preg_replace('/[^0-9a-f]/i', '', $contactId));
    }

    /**
     * Make the calendar match the person's saved dates: add or update one
     * yearly event per person, remove events for people they deleted.
     *
     * @return int events on the calendar
     */
    public static function syncCalendar(GoogleConnection $conn): int
    {
        if (!$conn->calendar_enabled || !$conn->has(GoogleConnection::CALENDAR)) return 0;
        $user = $conn->user;
        $cal = rawurlencode(self::calendarId($conn));

        // What's there now, with a fingerprint so unchanged events are skipped.
        $existing = [];
        $page = null;
        do {
            $res = self::api($conn)->get(self::CAL . "/calendars/{$cal}/events", array_filter([
                'maxResults' => 2500, 'showDeleted' => 'false', 'pageToken' => $page,
                'fields' => 'items(id,extendedProperties),nextPageToken',
            ]));
            if (!$res->ok()) throw new \RuntimeException('Google Calendar did not respond. Try again later.');
            foreach ((array)$res->json('items', []) as $e) $existing[$e['id']] = $e['extendedProperties']['private']['h'] ?? null;
            $page = $res->json('nextPageToken');
        } while ($page);

        $year = CarbonImmutable::now(BirthdayBook::TZ)->year;
        $wanted = [];
        foreach (BirthdayBook::people($user) as $p) {
            if (!$p['remind_date']) continue;
            [, $m, $d] = array_map('intval', explode('-', $p['remind_date']));
            $id = self::eventId($p['id']);
            $start = CarbonImmutable::create($year, $m, min($d, CarbonImmutable::create($year, $m, 1)->daysInMonth));
            $isBirthday = $p['occasion'] === 'Birthday';
            $body = [
                'id' => $id,
                'summary' => ($isBirthday ? '🎂 ' : '🎉 ') . $p['name'] . "'s " . strtolower($p['occasion']),
                'description' => "Make {$p['first']}'s day: send a mystery gift that opens on the day.\n" . route('occasions.gift', ['contact' => $p['id']]) . "\n\nFrom your Giftnify Birthdays calendar.",
                'start' => ['date' => $start->format('Y-m-d')],
                'end' => ['date' => $start->addDay()->format('Y-m-d')],
                'recurrence' => [$m === 2 && $d === 29 ? 'RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1' : 'RRULE:FREQ=YEARLY'],
                'transparency' => 'transparent',
                'reminders' => ['useDefault' => false, 'overrides' => [
                    ['method' => 'popup', 'minutes' => 7 * 24 * 60 - 9 * 60],  // a week before, 9am
                    ['method' => 'popup', 'minutes' => 24 * 60 - 9 * 60],      // the day before, 9am
                ]],
                'source' => ['title' => 'Giftnify', 'url' => url('/occasions')],
            ];
            $hash = substr(md5(json_encode($body)), 0, 12);
            $body['extendedProperties'] = ['private' => ['h' => $hash, 'giftnify' => '1']];
            $wanted[$id] = true;

            if (($existing[$id] ?? null) === $hash) continue;
            $res = array_key_exists($id, $existing)
                ? self::api($conn)->put(self::CAL . "/calendars/{$cal}/events/{$id}", $body)
                : self::api($conn)->post(self::CAL . "/calendars/{$cal}/events", $body);
            if ($res->status() === 409) $res = self::api($conn)->put(self::CAL . "/calendars/{$cal}/events/{$id}", $body);
            if (!$res->successful()) report(new \RuntimeException("Calendar event {$id}: " . $res->status()));
        }

        foreach (array_keys($existing) as $id) {
            if (!isset($wanted[$id]) && str_starts_with($id, 'gn')) {
                self::api($conn)->delete(self::CAL . "/calendars/{$cal}/events/{$id}");
            }
        }

        $conn->update(['calendar_events' => count($wanted), 'calendar_synced_at' => now(), 'last_error' => null]);
        return count($wanted);
    }

    /** Turn the calendar off (and remove the Giftnify Birthdays calendar). */
    public static function stopCalendar(GoogleConnection $conn): void
    {
        if ($conn->calendar_id) {
            try { self::api($conn)->delete(self::CAL . '/calendars/' . rawurlencode($conn->calendar_id)); } catch (\Throwable) {}
        }
        $conn->update(['calendar_enabled' => false, 'calendar_id' => null, 'calendar_events' => 0, 'calendar_synced_at' => null]);
    }

    /** Disconnect: remove our calendar, revoke access, forget the tokens. */
    public static function disconnect(GoogleConnection $conn): void
    {
        try {
            self::stopCalendar($conn);
            Http::asForm()->timeout(10)->post(self::REVOKE, ['token' => $conn->refresh_token ?: $conn->access_token]);
        } catch (\Throwable) {
            // Already revoked on Google's side.
        }
        $conn->delete();
    }

    /** Re-sync the calendar after the response is sent (contacts changed). */
    public static function queueSync(User $user): void
    {
        $conn = GoogleConnection::where('user_id', $user->id)->where('calendar_enabled', true)->first();
        if (!$conn || !GoogleSettings::configured()) return;
        dispatch(function () use ($conn) {
            try {
                self::syncCalendar($conn->fresh());
            } catch (\Throwable $e) {
                $conn->update(['last_error' => mb_substr($e->getMessage(), 0, 300)]);
            }
        })->afterResponse();
    }
}
