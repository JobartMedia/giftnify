<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\Gift;
use App\Services\AiService;
use App\Services\DeliveryService;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class GiftController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $gifts = Gift::where('sender_id', $user->id)
            ->latest()
            ->paginate(15);

        return Inertia::render('Gift/Index', [
            'gifts' => $gifts,
        ]);
    }

    public function create(Request $request): Response
    {
        $contacts = $request->user() 
            ? Contact::where('user_id', $request->user()->id)->get() 
            : [];

        // Sending to a creator's gift link (/@name → Send).
        $creator = null;
        if ($request->query('creator')) {
            $u = \App\Models\User::where('username', strtolower((string)$request->query('creator')))->where('creator_enabled', true)->first();
            $creator = $u ? \App\Http\Controllers\CreatorController::publicProfileFor($u) : null;
        }

        return Inertia::render('Gift/Create', [
            'contacts' => $contacts,
            'creator' => $creator,
            'preselected' => [
                'to' => $request->query('to'),
                'occasion' => $request->query('occasion'),
                'item' => $request->query('item'),
                // Suggested price arrives in USD; the create page converts it to the sender's currency.
                'price_usd' => $request->query('price_usd') ? min(5000, max(1, (float)$request->query('price_usd'))) : null,
                'type' => $request->query('type'),
                'amount' => $request->query('amount') ? max(1, (float)$request->query('amount')) : null,
                'mode' => in_array($request->query('mode'), ['classic', 'guess', 'anonymous'], true) ? $request->query('mode') : null,
                // From a birthday reminder: who to send to, and the day it should open.
                'contact' => is_string($request->query('contact')) ? mb_substr($request->query('contact'), 0, 120) : null,
                'opens' => is_string($request->query('opens')) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $request->query('opens')) ? $request->query('opens') : null,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'recipient_name' => 'required_without:creator|nullable|string|min:2|max:80',
            'delivery' => 'required|in:WhatsApp,SMS,Email,Link',
            'recipient_contact' => 'nullable|string|max:120',
            'occasion' => 'required|string|max:50',
            'message_type' => 'required|in:text,audio,video',
            'message_text' => 'nullable|string|max:2000',
            'currency' => ['required', 'string', 'max:10', function ($attr, $value, $fail) {
                if (!in_array(strtoupper($value), \App\Services\PaymentService::payableCurrencies(), true)) {
                    $fail("Payments in {$value} aren't available yet. Choose another currency.");
                }
            }],
            'amount' => 'required|numeric|min:0.5',
            'item' => 'nullable|string|max:100',
            'relationship' => 'nullable|string|in:' . implode(',', AiService::RELATIONSHIPS),
            'sender_hint' => 'nullable|string|max:180',
            'media' => 'nullable|file|mimes:webm,mp4,mov,ogg,mp3,wav|max:51200', // 50MB max
            // How the mystery plays out
            'reveal_mode' => 'nullable|in:classic,guess,anonymous',
            'guess_hints' => 'nullable|array|max:3',
            'guess_hints.*' => 'nullable|string|max:120',
            'guess_names' => 'nullable|string|max:120',
            'value_teaser' => 'nullable|in:mystery,figures',
            'unlock_at' => 'nullable|date|after:now|before:+1 year',
            // Gifts to a creator's gift link
            'creator' => 'nullable|string|max:30',
            'wall_note' => 'nullable|string|max:140',
            'on_wall' => 'nullable|boolean',
        ]);

        // A gift to a creator's link goes to their account: they open it signed in, the cash lands in their wallet.
        $creator = null;
        if (!empty($validated['creator'])) {
            $creator = \App\Models\User::where('username', strtolower($validated['creator']))->where('creator_enabled', true)->first();
            if (!$creator) {
                return response()->json(['message' => "That gift link isn't active any more.", 'errors' => ['creator' => ["That gift link isn't active any more."]]], 422);
            }
            if ($request->user() && $request->user()->id === $creator->id) {
                return response()->json(['message' => "You can't send a gift to your own link.", 'errors' => ['creator' => ["You can't send a gift to your own link."]]], 422);
            }
            $validated['delivery'] = 'Email';
            $validated['recipient_contact'] = $creator->email;
            $validated['recipient_name'] = $creator->name ?: '@' . $creator->username;
        }

        // Validate delivery channel and contact via DeliveryService
        $delivError = $creator ? null : DeliveryService::validate($validated['delivery'], $validated['recipient_contact'] ?? null);
        if ($delivError) {
            return response()->json(['message' => $delivError, 'errors' => ['recipient_contact' => [$delivError]]], 422);
        }

        $mediaPath = null;
        if ($request->hasFile('media')) {
            $mediaPath = $request->file('media')->store('gifts/media', 'public');
        }

        $token = Gift::generateSecureToken(12);

        $senderName = $request->user() 
            ? ($request->user()->name ?: explode('@', $request->user()->email)[0]) 
            : 'A friend';

        // The hint the recipient sees before the reveal. A sender-edited hint is
        // kept only if it still protects the mystery; otherwise we write one.
        $hintContext = [
            'relationship' => $validated['relationship'] ?? null,
            'occasion' => $validated['occasion'],
            'sender_name' => $senderName,
            'recipient_name' => $validated['recipient_name'],
        ];
        $hint = AiService::acceptSenderHint($validated['sender_hint'] ?? null, $hintContext)
            ?? AiService::senderHint($hintContext);

        // Guess-who game: the sender's hints (one shown per try) and other names they go by.
        $mode = $validated['reveal_mode'] ?? 'classic';
        $guessHints = null;
        $nicknames = [];
        if ($mode === 'guess') {
            $nicknames = array_values(array_filter(array_map('trim', explode(',', (string)($validated['guess_names'] ?? ''))), fn ($n) => mb_strlen($n) >= 2));
            [$guessHints, $hintError] = \App\Services\GuessGame::cleanHints($validated['guess_hints'] ?? [], $senderName, $nicknames);
            if ($hintError) {
                return response()->json(['message' => $hintError, 'errors' => ['guess_hints' => [$hintError]]], 422);
            }
            // No hints written? Use the mystery hint as the first one.
            if (!$guessHints) $guessHints = [$hint];
        }

        $gift = Gift::create([
            'token' => $token,
            'sender_id' => $request->user()?->id,
            'sender_name' => $senderName,
            'recipient_name' => $validated['recipient_name'],
            'recipient_contact' => DeliveryService::normalizeContact($validated['delivery'], $validated['recipient_contact'] ?? null),
            'occasion' => $validated['occasion'],
            'relationship' => $validated['relationship'] ?? null,
            'sender_hint' => $hint,
            'message_type' => $validated['message_type'],
            'message_text' => ($validated['message_text'] ?? null) ?: 'A little something to make you smile.',
            'media_path' => $mediaPath,
            'currency' => strtoupper($validated['currency']),
            'amount' => $validated['amount'],
            'item' => ($validated['item'] ?? null) ?: null,
            'delivery' => $validated['delivery'],
            'status' => 'Awaiting Payment',
            'expires_at' => (!empty($validated['unlock_at']) ? \Illuminate\Support\Carbon::parse($validated['unlock_at']) : now())->addDays(90),
            'reveal_mode' => $mode,
            'guess_hints' => $guessHints,
            'guess_answers' => $mode === 'guess' ? $nicknames : null,
            'value_teaser' => $validated['value_teaser'] ?? 'mystery',
            'unlock_at' => !empty($validated['unlock_at']) ? \Illuminate\Support\Carbon::parse($validated['unlock_at'])->utc() : null,
            'recipient_user_id' => $creator?->id,
            'wall_note' => $creator ? (trim(strip_tags((string)($validated['wall_note'] ?? ''))) ?: null) : null,
            'on_wall' => $creator ? (bool)($validated['on_wall'] ?? false) : false,
        ]);

        return response()->json([
            'token' => $token,
            'redirect' => route('gifts.checkout', ['token' => $token]),
        ]);
    }

    /** Hint preview for the sender while creating a gift (same rules as store). */
    public function hint(Request $request)
    {
        $validated = $request->validate([
            'relationship' => 'nullable|string|in:' . implode(',', AiService::RELATIONSHIPS),
            'occasion' => 'nullable|string|max:50',
            'recipient_name' => 'nullable|string|max:80',
        ]);

        $key = "hint:{$request->ip()}";
        if (RateLimiter::tooManyAttempts($key, 15)) {
            return response()->json(['message' => 'Too many requests. Please wait a minute.'], 429);
        }
        RateLimiter::hit($key, 60);

        $user = $request->user();
        return response()->json(['hint' => AiService::senderHint($validated + [
            'sender_name' => $user?->name ?? '',
        ])]);
    }
}
