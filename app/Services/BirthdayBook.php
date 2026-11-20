<?php

namespace App\Services;

use App\Models\Contact;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * The people someone has saved, and when their next birthday (or other
 * occasion) is. A saved date wins; otherwise, if the contact's phone or email
 * belongs to someone on Giftnify who lets contacts see their birthday, their
 * own birthday is used. Only the day and month are ever shared.
 */
class BirthdayBook
{
    public const TZ = 'Africa/Lagos';
    /** Reminder emails go out this many days before. */
    public const LEADS = [7, 1];
    /** Logged as the "lead" for the day-after follow-up. */
    public const FOLLOW_UP = 99;

    /** Last 10 digits: "0803 555 0142", "+234 803 555 0142" and "2348035550142" all match. */
    public static function phoneKey(?string $phone): ?string
    {
        $digits = preg_replace('/\D/', '', (string)$phone);
        return strlen($digits) >= 9 ? substr($digits, -10) : null;
    }

    /**
     * Each contact with its resolved date.
     *
     * @return Collection<int, array>
     */
    public static function people(User $owner, ?CarbonImmutable $today = null): Collection
    {
        $today ??= CarbonImmutable::now(self::TZ)->startOfDay();
        $contacts = Contact::where('user_id', $owner->id)->orderBy('name')->get();
        if ($contacts->isEmpty()) return collect();

        $emails = $contacts->pluck('email')->filter()->map(fn ($e) => strtolower($e))->unique()->values();
        $keys = $contacts->pluck('phone_key')->filter()->unique()->values();
        $members = User::where('id', '!=', $owner->id)
            ->where(function ($q) use ($emails, $keys) {
                $q->whereIn(\DB::raw('lower(email)'), $emails)->orWhereIn('phone_key', $keys);
            })
            ->where(fn ($q) => $q->whereNull('status')->orWhere('status', 'active'))
            ->get(['id', 'name', 'email', 'phone_key', 'birth_day', 'birth_month', 'birthday_visible', 'username', 'creator_enabled', 'avatar_url']);
        $byEmail = $members->keyBy(fn ($u) => strtolower($u->email));
        $byKey = $members->filter(fn ($u) => $u->phone_key)->keyBy('phone_key');

        return $contacts->map(function (Contact $c) use ($byEmail, $byKey, $today) {
            $member = ($c->email ? $byEmail->get(strtolower($c->email)) : null) ?? ($c->phone_key ? $byKey->get($c->phone_key) : null);
            $occasion = $c->occasion ?: 'Birthday';

            $month = $day = null;
            $source = null;
            if ($c->occasion_date) {
                [$month, $day, $source] = [(int)$c->occasion_date->format('n'), (int)$c->occasion_date->format('j'), 'saved'];
            } elseif ($occasion === 'Birthday' && $member && $member->birthday_visible && $member->birth_month && $member->birth_day) {
                [$month, $day, $source] = [$member->birth_month, $member->birth_day, 'giftnify'];
            }

            $next = $month ? self::nextOccurrence($month, $day, $today) : null;
            return [
                'id' => $c->id,
                'name' => $c->name,
                'first' => explode(' ', trim($c->name))[0],
                'phone' => $c->phone,
                'email' => $c->email,
                'occasion' => $occasion,
                'occasion_date' => $c->occasion_date?->format('Y-m-d'),
                'source' => $c->source,
                'on_giftnify' => (bool)$member,
                'date_source' => $source,
                // A yearless date the app can use for its countdown (year 2000 is a placeholder).
                'remind_date' => $month ? sprintf('2000-%02d-%02d', $month, $day) : null,
                'next_date' => $next?->format('Y-m-d'),
                'date_label' => $month ? CarbonImmutable::create(2000, $month, $day)->format('j M') : null,
                'days' => $next ? (int)$today->diffInDays($next) : null,
                'gift_link' => $member && $member->username && $member->creator_enabled ? url('/@' . $member->username) : null,
                'avatar_url' => $member?->avatar_url,
            ];
        });
    }

    /** People with a date, soonest first. */
    public static function upcoming(User $owner, int $withinDays = 366): Collection
    {
        return self::people($owner)->filter(fn ($p) => $p['days'] !== null && $p['days'] <= $withinDays)
            ->sortBy([['days', 'asc'], ['name', 'asc']])->values();
    }

    public static function nextOccurrence(int $month, int $day, CarbonImmutable $today): CarbonImmutable
    {
        foreach ([$today->year, $today->year + 1] as $y) {
            $d = min($day, CarbonImmutable::create($y, $month, 1, 0, 0, 0, self::TZ)->daysInMonth);
            $date = CarbonImmutable::create($y, $month, $d, 0, 0, 0, self::TZ);
            if ($date->gte($today)) return $date;
        }
        return $date;
    }

    /** People whose day was yesterday, and the owner hasn't sent them a gift around it. */
    public static function missedYesterday(User $owner): Collection
    {
        $yesterday = CarbonImmutable::now(self::TZ)->startOfDay()->subDay();
        return self::people($owner, $yesterday)->filter(fn ($p) => $p['days'] === 0)
            ->reject(function ($p) use ($owner, $yesterday) {
                $key = self::phoneKey($p['phone']);
                return \App\Models\Gift::where('sender_id', $owner->id)
                    ->whereNotIn('status', ['Awaiting Payment', 'Cancelled', 'Refunded'])
                    ->where('created_at', '>=', $yesterday->subDays(14)->utc())
                    ->where(function ($q) use ($p, $key) {
                        if ($p['email']) $q->orWhere(\DB::raw('lower(recipient_contact)'), strtolower($p['email']));
                        if ($key) $q->orWhere('recipient_contact', 'like', '%' . substr($key, -9));
                        if (!$p['email'] && !$key) $q->whereRaw('1 = 0');
                    })->exists();
            })->values();
    }

    /** Link to start a gift for this person, set to open at midnight on the day. */
    public static function giftLink(array $p, bool $scheduled = true): string
    {
        $q = array_filter([
            'to' => $p['name'],
            'occasion' => $p['occasion'],
            'contact' => $p['email'] ?: $p['phone'],
            'opens' => $scheduled && $p['days'] > 0 ? $p['next_date'] : null,
        ]);
        return url('/create?' . http_build_query($q));
    }

    /** Validation rules for one imported person. */
    public const IMPORT_RULES = [
        'contacts' => 'required|array|min:1|max:1000',
        'contacts.*.name' => 'required|string|min:1|max:80',
        'contacts.*.phone' => 'nullable|string|max:40',
        'contacts.*.email' => 'nullable|email|max:120',
        'contacts.*.birth_day' => 'nullable|integer|min:1|max:31',
        'contacts.*.birth_month' => 'nullable|integer|min:1|max:12',
        'source' => 'nullable|in:phone,vcard,manual,google',
    ];

    /**
     * Save many people at once (from the phone or a contacts file). People
     * already saved, by phone or email, are skipped.
     *
     * @return array{added: int, skipped: int}
     */
    public static function import(User $owner, array $rows, string $source = 'phone'): array
    {
        $existing = Contact::where('user_id', $owner->id)->get(['phone_key', 'email']);
        $keys = $existing->pluck('phone_key')->filter()->flip()->all();
        $emails = $existing->pluck('email')->filter()->map(fn ($e) => strtolower($e))->flip()->all();
        if ($owner->phone_key) $keys[$owner->phone_key] = true;
        $emails[strtolower($owner->email)] = true;

        $added = $skipped = 0;
        foreach ($rows as $r) {
            $name = trim((string)($r['name'] ?? ''));
            $phone = trim((string)($r['phone'] ?? '')) ?: null;
            $email = strtolower(trim((string)($r['email'] ?? ''))) ?: null;
            $key = self::phoneKey($phone);
            if ($name === '' || (!$key && !$email) || ($key && isset($keys[$key])) || ($email && isset($emails[$email]))) {
                $skipped++;
                continue;
            }
            $date = null;
            $m = (int)($r['birth_month'] ?? 0); $d = (int)($r['birth_day'] ?? 0);
            if ($m && $d && checkdate($m, $d, 2000)) $date = sprintf('2000-%02d-%02d', $m, $d);

            Contact::create(['user_id' => $owner->id, 'name' => mb_substr($name, 0, 80), 'phone' => $phone, 'email' => $email,
                'occasion' => 'Birthday', 'occasion_date' => $date, 'source' => $source]);
            if ($key) $keys[$key] = true;
            if ($email) $emails[$email] = true;
            $added++;
        }
        return ['added' => $added, 'skipped' => $skipped];
    }

    /** The owner's own birthday and reminder settings. */
    public static function settings(User $u): array
    {
        return [
            'birth_day' => $u->birth_day,
            'birth_month' => $u->birth_month,
            'birthday_locked' => (bool)$u->birthday_set_at,
            'birthday_visible' => (bool)($u->birthday_visible ?? true),
            'birthday_reminders' => (bool)($u->birthday_reminders ?? true),
            'phone' => $u->phone,
        ];
    }

    /** Shared validation for sign-up: birthday is day + month (no year). */
    public static function birthdayFromRequest(array $v): array
    {
        $m = (int)($v['birth_month'] ?? 0); $d = (int)($v['birth_day'] ?? 0);
        if (!$m || !$d) return [];
        return ['birth_month' => $m, 'birth_day' => $d, 'birthday_set_at' => now()];
    }
}
