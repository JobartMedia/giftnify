<?php

namespace App\Http\Controllers;

use App\Services\AiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Inertia;
use Inertia\Response;

class GiftSenseController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('GiftSense/Index');
    }

    public function generate(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:60',
            'relationship' => 'nullable|string|max:40',
            'occasion' => 'nullable|string|max:40',
            'interests' => 'nullable|array',
            'budget' => 'nullable|string|max:30',
        ]);

        $ip = $request->ip();
        if (RateLimiter::tooManyAttempts("ai_dna:{$ip}", 10)) {
            return response()->json(['message' => 'Too many requests. Please wait a minute.'], 429);
        }
        RateLimiter::hit("ai_dna:{$ip}", 60);

        $result = AiService::giftSense($validated);
        return response()->json($result);
    }

    public function writeMessage(Request $request)
    {
        $validated = $request->validate([
            'recipient' => 'nullable|string|max:80',
            'occasion' => 'nullable|string|max:50',
            'tone' => 'nullable|string|max:30',
            'draft' => 'nullable|string|max:2000',
            'language' => 'nullable|string|max:30',
            'length' => 'nullable|string|max:20',
        ]);

        $ip = $request->ip();
        if (RateLimiter::tooManyAttempts("ai_write:{$ip}", 15)) {
            return response()->json(['message' => 'Too many AI requests. Please wait a minute.'], 429);
        }
        RateLimiter::hit("ai_write:{$ip}", 60);

        $message = AiService::writeMessage($validated);
        return response()->json(['text' => $message]);
    }
}
