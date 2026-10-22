<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiService
{
    public static function writeMessage(array $data): string
    {
        $key = config('services.ai.key');
        // Any of these can be missing from the request; never index them directly.
        $recipient = trim((string)($data['recipient'] ?? '')) ?: 'a loved one';
        $occasion = trim((string)($data['occasion'] ?? '')) ?: 'special day';
        $tone = trim((string)($data['tone'] ?? '')) ?: 'warm';
        $draft = trim((string)($data['draft'] ?? ''));
        $language = trim((string)($data['language'] ?? '')) ?: 'English';
        $length = trim((string)($data['length'] ?? '')) ?: 'medium';

        if (!$key) {
            // Intelligent fallback template
            return "Wishing you an unforgettable {$occasion}, {$recipient}! May this day bring you endless joy and happiness. Enjoy every moment of your special gift!";
        }

        try {
            $prompt = "Write a {$length} {$tone} {$occasion} gift message for {$recipient} in {$language}.";
            if (!empty($draft)) {
                $prompt .= " Polish and elevate this draft while keeping its heartfelt intent: \"{$draft}\".";
            }

            $response = Http::withHeaders([
                'Authorization' => "Bearer {$key}",
                'Content-Type' => 'application/json',
            ])->timeout(12)->post('https://api.openai.com/v1/chat/completions', [
                'model' => 'gpt-4o-mini',
                'messages' => [
                    ['role' => 'system', 'content' => 'You are an elite luxury personal gift writer. Write emotional, warm, memorable gift cards. Return only the message text without quotation marks or conversational preamble.'],
                    ['role' => 'user', 'content' => $prompt]
                ],
                'temperature' => 0.7,
            ]);

            if ($response->successful()) {
                return trim($response->json('choices.0.message.content'));
            }
        } catch (\Throwable $e) {
            Log::error('AI generation error: ' . $e->getMessage());
        }

        return "Thinking of you on this {$occasion}, {$recipient}. Here's something special to celebrate you!";
    }

    private const IDEA_ICONS = ['perfume', 'spa', 'flowers', 'bag', 'food', 'money', 'headphones', 'giftcard', 'cake', 'ring', 'sparkle'];

    /**
     * Gift ideas from the AI model. Without a key (or if the model fails) it
     * returns clearly flagged examples instead of pretending they are tailored.
     */
    public static function giftSense(array $data): array
    {
        $key = config('services.ai.key');
        $examples = [
            ['name' => 'Signature perfume', 'icon' => 'perfume', 'priceUsd' => 85, 'why' => 'A personal, everyday reminder of you.', 'tag' => 'Example'],
            ['name' => 'Spa day for one', 'icon' => 'spa', 'priceUsd' => 75, 'why' => 'Time to rest, which most people never book for themselves.', 'tag' => 'Example'],
            ['name' => 'Flower bouquet', 'icon' => 'flowers', 'priceUsd' => 45, 'why' => 'Classic and right for almost any occasion.', 'tag' => 'Example'],
            ['name' => 'Wireless earbuds', 'icon' => 'headphones', 'priceUsd' => 99, 'why' => 'Useful every day for music and calls.', 'tag' => 'Example'],
            ['name' => 'Dinner box', 'icon' => 'food', 'priceUsd' => 40, 'why' => 'A good meal they can share.', 'tag' => 'Example'],
            ['name' => 'Cash gift', 'icon' => 'money', 'priceUsd' => 50, 'why' => 'Lets them choose exactly what they want.', 'tag' => 'Example'],
        ];

        if (!$key) {
            return ['examples' => true, 'recommendations' => $examples];
        }

        $interests = implode(', ', array_slice((array)($data['interests'] ?? []), 0, 8)) ?: 'not given';
        $prompt = sprintf(
            "Suggest 6 gift ideas for %s (relationship: %s). Occasion: %s. Interests: %s. Budget: %s. They live in Nigeria unless the budget suggests otherwise.",
            $data['name'] ?? 'someone', $data['relationship'] ?? 'not given', $data['occasion'] ?? 'not given', $interests, $data['budget'] ?? 'not given'
        );

        try {
            $response = Http::withHeaders(['Authorization' => "Bearer {$key}"])
                ->timeout(20)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => 'gpt-4o-mini',
                    'temperature' => 0.8,
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        ['role' => 'system', 'content' => 'You suggest thoughtful, specific gifts. Return JSON: {"ideas":[{"name": short gift name, "why": one sentence tied to their interests, "priceUsd": typical price as a number, "icon": one of ' . implode('|', self::IDEA_ICONS) . ', "tag": one or two words}]}. No brand claims you are unsure of.'],
                        ['role' => 'user', 'content' => $prompt],
                    ],
                ]);

            $ideas = (array)(json_decode((string)$response->json('choices.0.message.content'), true)['ideas'] ?? []);
            $clean = [];
            foreach ($ideas as $i) {
                if (empty($i['name']) || empty($i['why'])) continue;
                $clean[] = [
                    'name' => mb_substr(strip_tags((string)$i['name']), 0, 60),
                    'why' => mb_substr(strip_tags((string)$i['why']), 0, 180),
                    'priceUsd' => max(5, min(2000, (int)round((float)($i['priceUsd'] ?? 50)))),
                    'icon' => in_array($i['icon'] ?? '', self::IDEA_ICONS, true) ? $i['icon'] : 'gift',
                    'tag' => mb_substr(strip_tags((string)($i['tag'] ?? 'Idea')), 0, 20),
                ];
            }
            if (count($clean) >= 3) {
                return ['examples' => false, 'recommendations' => array_slice($clean, 0, 6)];
            }
        } catch (\Throwable $e) {
            Log::warning('Gift ideas failed: ' . $e->getMessage());
        }

        return ['examples' => true, 'recommendations' => $examples];
    }

    /* ------------------------------------------------------------------
     | Mystery reveal hint
     | Shown to the recipient before the reveal. It has to be specific enough
     | to spark curiosity and vague enough to fit about five people.
     * ------------------------------------------------------------------ */

    public const RELATIONSHIPS = ['Family', 'Partner', 'Friend', 'Old friend', 'Colleague', 'Mentor', 'Other'];

    private const HINT_FALLBACKS = [
        'Family' => [
            'Someone who has known you since before you were this version of yourself.',
            'Someone who has watched you grow and still keeps the old photos.',
            'Someone whose voice you would recognise in a crowded room.',
        ],
        'Partner' => [
            'Someone who thinks about you more often than you would guess.',
            'Someone who saves your messages so they can read them twice.',
            'Someone who knows the version of you that few people get to see.',
        ],
        'Friend' => [
            'Someone who has laughed with you at things nobody else understood.',
            'Someone who would pick up your call at any hour.',
            'Someone who has seen you at your best and stayed for the rest.',
        ],
        'Old friend' => [
            'Someone who remembers who you were before everything got busy.',
            'Someone who shares a few chapters of your story nobody else knows.',
            'Someone you have not heard from in a while, who never stopped caring.',
        ],
        'Colleague' => [
            'Someone who has seen how hard you work when nobody else is watching.',
            'Someone who notices more of your good days than you think.',
            'Someone who has shared a long week or two with you.',
        ],
        'Mentor' => [
            'Someone who saw something in you early and never stopped believing it.',
            'Someone who has quietly been in your corner for a long time.',
        ],
        'Other' => [
            'Someone who has been quietly cheering for you for a while now.',
            'Someone who wanted today to feel a little different for you.',
            'Someone who thought of you the moment this day came around.',
        ],
    ];

    private const HINT_BANNED = [
        'someone special', 'secret admirer', 'who cares about you', 'who loves you',
        'mother', 'father', 'mum', 'mom', 'dad', 'sister', 'brother', 'aunt', 'uncle', 'cousin',
        'wife', 'husband', 'girlfriend', 'boyfriend', 'boss', 'manager', 'teacher', 'coworker', 'colleague',
        ' he ', ' she ', ' him ', ' her ', ' his ', ' hers ',
    ];

    /** Returns a warm, deliberately vague one-sentence hint. Never throws. */
    public static function senderHint(array $data): string
    {
        $relationship = in_array($data['relationship'] ?? null, self::RELATIONSHIPS, true) ? $data['relationship'] : 'Other';
        $occasion = trim((string)($data['occasion'] ?? '')) ?: 'a special day';
        $forbiddenNames = array_filter(array_merge(
            preg_split('/\s+/', (string)($data['sender_name'] ?? '')) ?: [],
            preg_split('/\s+/', (string)($data['recipient_name'] ?? '')) ?: [],
        ), fn ($w) => mb_strlen($w) >= 3);

        $key = config('services.ai.key');
        if ($key) {
            try {
                $response = Http::withHeaders([
                    'Authorization' => "Bearer {$key}",
                    'Content-Type' => 'application/json',
                ])->timeout(10)->post('https://api.openai.com/v1/chat/completions', [
                    'model' => 'gpt-4o-mini',
                    'temperature' => 0.9,
                    'messages' => [
                        ['role' => 'system', 'content' => implode("\n", [
                            'You write the single hint a person reads before they find out who sent them a mystery gift.',
                            'Goal: curiosity without giving the sender away. The hint must honestly fit at least five different people in their life.',
                            'Rules:',
                            '- One sentence, 8 to 18 words, starting with "Someone who".',
                            '- Warm, specific in feeling, vague in facts. Describe the kind of bond (time, trust, a shared season), never facts.',
                            '- Never include names, initials, nicknames, places, dates, ages, numbers, jobs, physical traits, gendered words or pronouns (he/she/his/her), or family titles.',
                            '- Never use: "someone special", "secret admirer", "who loves you", "who cares about you".',
                            '- No emojis, no quotation marks.',
                            'Return a JSON object: {"hints": [three different candidate sentences]}.',
                        ])],
                        ['role' => 'user', 'content' => "Private context (do not state it): the sender is their {$relationship}. Occasion: {$occasion}."],
                    ],
                    'response_format' => ['type' => 'json_object'],
                ]);

                if ($response->successful()) {
                    $decoded = json_decode((string)$response->json('choices.0.message.content'), true);
                    foreach ((array)($decoded['hints'] ?? []) as $candidate) {
                        $clean = self::cleanHint((string)$candidate);
                        if (self::hintIsValid($clean, $forbiddenNames)) {
                            return $clean;
                        }
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Hint generation failed: ' . $e->getMessage());
            }
        }

        $pool = self::HINT_FALLBACKS[$relationship];
        return $pool[array_rand($pool)];
    }

    /** Accepts a sender-edited hint only if it still keeps the mystery. */
    public static function acceptSenderHint(?string $hint, array $data): ?string
    {
        if (!$hint) return null;
        $clean = self::cleanHint($hint);
        $names = array_filter(array_merge(
            preg_split('/\s+/', (string)($data['sender_name'] ?? '')) ?: [],
            preg_split('/\s+/', (string)($data['recipient_name'] ?? '')) ?: [],
        ), fn ($w) => mb_strlen($w) >= 3);
        return self::hintIsValid($clean, $names, true) ? $clean : null;
    }

    private static function cleanHint(string $hint): string
    {
        $hint = trim(preg_replace('/\s+/', ' ', strip_tags($hint)));
        $hint = trim($hint, " \"'\u{201C}\u{201D}");
        if ($hint !== '' && !preg_match('/[.!?]$/', $hint)) $hint .= '.';
        return mb_substr($hint, 0, 180);
    }

    private static function hintIsValid(string $hint, array $forbiddenNames, bool $senderWritten = false): bool
    {
        $words = str_word_count($hint);
        if ($words < ($senderWritten ? 4 : 7) || $words > ($senderWritten ? 26 : 20)) return false;
        if (preg_match('/\d/', $hint)) return false;
        $padded = ' ' . mb_strtolower(preg_replace('/[^\p{L}\s]/u', ' ', $hint)) . ' ';
        if (!$senderWritten) {
            foreach (self::HINT_BANNED as $banned) {
                if (str_contains($padded, ' ' . trim($banned) . ' ')) return false;
            }
        }
        foreach ($forbiddenNames as $name) {
            if (str_contains($padded, ' ' . mb_strtolower($name) . ' ')) return false;
        }
        return true;
    }
}
