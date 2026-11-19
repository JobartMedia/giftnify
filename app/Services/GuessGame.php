<?php

namespace App\Services;

use App\Models\Gift;
use Illuminate\Support\Str;

/**
 * "Guess who sent it": the recipient gets 3 tries, a new hint after each wrong
 * guess, and can skip at any time. The answer never leaves the server until the
 * reveal, so hints are handed out one at a time.
 */
class GuessGame
{
    /** Accepted answers: the sender's full name, each part of it, and any nicknames the sender gave. */
    public static function answers(Gift $gift): array
    {
        $names = [(string)$gift->sender_name];
        foreach ((array)($gift->guess_answers ?? []) as $n) $names[] = (string)$n;

        $out = [];
        foreach ($names as $n) {
            $norm = self::normalize($n);
            if ($norm === '' || in_array($norm, ['a friend', 'anonymous'], true)) continue;
            $out[] = $norm;
            foreach (explode(' ', $norm) as $part) {
                if (mb_strlen($part) >= 3) $out[] = $part;
            }
        }
        return array_values(array_unique($out));
    }

    public static function isCorrect(Gift $gift, string $guess): bool
    {
        $g = self::normalize($guess);
        if (mb_strlen($g) < 2) return false;
        $answers = self::answers($gift);
        foreach ($answers as $a) {
            if ($g === $a) return true;
            // Small typos on longer names ("Adebayo" vs "Adebayor").
            if (mb_strlen($a) >= 5 && levenshtein($g, $a) <= 1) return true;
        }
        // "It's Seun!", "my brother Seun" — any guessed word matching a name of 3+ letters.
        foreach (explode(' ', $g) as $word) {
            if (mb_strlen($word) >= 3 && in_array($word, $answers, true)) return true;
        }
        return false;
    }

    /** Hints the recipient may see now: one per try used, plus the first. */
    public static function visibleHints(Gift $gift): array
    {
        $hints = array_values(array_filter((array)($gift->guess_hints ?? []), fn ($h) => trim((string)$h) !== ''));
        $count = min(count($hints), 1 + (int)$gift->guess_attempts);
        return array_slice($hints, 0, max(1, $count));
    }

    public static function triesLeft(Gift $gift): int
    {
        return max(0, Gift::GUESS_TRIES - (int)$gift->guess_attempts);
    }

    /**
     * Cleans the sender's game hints. Returns [hints, error]: a hint may not
     * contain any of the names that would be accepted as the answer.
     *
     * @return array{0: array<int,string>, 1: ?string}
     */
    public static function cleanHints(array $raw, string $senderName, array $nicknames): array
    {
        $names = [];
        foreach (array_merge([$senderName], $nicknames) as $n) {
            foreach (explode(' ', self::normalize((string)$n)) as $p) if (mb_strlen($p) >= 3) $names[] = $p;
        }
        $out = [];
        foreach (array_values($raw) as $i => $h) {
            $h = trim(preg_replace('/\s+/', ' ', strip_tags((string)$h)) ?? '');
            if ($h === '') continue;
            $h = mb_substr($h, 0, 120);
            $words = ' ' . self::normalize($h) . ' ';
            foreach ($names as $n) {
                if (str_contains($words, " {$n} ")) {
                    return [[], 'Hint ' . ($i + 1) . ' gives away your name. Rewrite it without "' . ucfirst($n) . '".'];
                }
            }
            $out[] = $h;
        }
        return [array_slice($out, 0, Gift::GUESS_TRIES), null];
    }

    public static function normalize(string $s): string
    {
        $s = Str::ascii(mb_strtolower(trim($s)));
        $s = preg_replace('/[^a-z0-9 ]+/', ' ', $s) ?? '';
        $s = preg_replace('/\b(it|is|its|it s|my|the|from|uncle|aunty|auntie|mr|mrs|ms|dr|bro|sis|was)\b/', ' ', $s) ?? $s;
        return trim(preg_replace('/\s+/', ' ', $s) ?? '');
    }
}
