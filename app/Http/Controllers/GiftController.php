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

        return Inertia::render('Gift/Create', [
            'contacts' => $contacts,
            'preselected' => [
                'to' => $request->query('to'),
                'occasion' => $request->query('occasion'),
                'item' => $request->query('item'),
                // Suggested price arrives in USD; the create page converts it to the sender's currency.
                'price_usd' => $request->query('price_usd') ? min(5000, max(1, (float)$request->query('price_usd'))) : null,
                'type' => $request->query('type'),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'recipient_name' => 'required|string|min:2|max:80',
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
        ]);

        // Validate delivery channel and contact via DeliveryService
        $delivError = DeliveryService::validate($validated['delivery'], $validated['recipient_contact'] ?? null);
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
            'expires_at' => now()->addDays(90),
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
