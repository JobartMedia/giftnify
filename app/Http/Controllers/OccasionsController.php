<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Services\BirthdayBook;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** The people you gift, their birthdays, and the reminders before them. */
class OccasionsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Occasions/Index', [
            'people' => $user ? BirthdayBook::people($user)->values() : [],
            'settings' => $user ? BirthdayBook::settings($user) : null,
            'welcome' => $request->boolean('welcome'),
            'leads' => BirthdayBook::LEADS,
        ]);
    }

    public function storeContact(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|min:2|max:80',
            'phone' => 'nullable|string|max:40',
            'email' => 'nullable|email|max:120',
            'occasion' => 'nullable|string|max:50',
            'occasion_date' => 'nullable|date',
        ]);

        $request->user()->contacts()->create($validated + ['source' => 'manual']);
        return back()->with('success', 'Saved. We\'ll remind you before their day.');
    }

    /** Many people at once, from the phone or a contacts file. */
    public function import(Request $request)
    {
        $v = $request->validate(BirthdayBook::IMPORT_RULES);
        $r = BirthdayBook::import($request->user(), $v['contacts'], $v['source'] ?? 'phone');
        if ($request->expectsJson() && !$request->header('X-Inertia')) return response()->json($r);
        return back()->with('success', "Added {$r['added']} " . ($r['added'] === 1 ? 'person' : 'people') . '.');
    }

    /** Reminders on/off, who can see my birthday, my phone, and my birthday if it isn't set yet. */
    public function settings(Request $request)
    {
        $user = $request->user();
        $v = $request->validate([
            'birthday_visible' => 'sometimes|boolean',
            'birthday_reminders' => 'sometimes|boolean',
            'phone' => 'sometimes|nullable|string|max:40',
            'birth_day' => 'sometimes|nullable|integer|min:1|max:31',
            'birth_month' => 'sometimes|nullable|integer|min:1|max:12',
        ]);
        $data = array_intersect_key($v, array_flip(['birthday_visible', 'birthday_reminders', 'phone']));
        if (!$user->birthday_set_at && !empty($v['birth_day']) && !empty($v['birth_month'])) {
            if (!checkdate((int)$v['birth_month'], (int)$v['birth_day'], 2000)) {
                return back()->withErrors(['birth_day' => 'That date does not exist.']);
            }
            $data += BirthdayBook::birthdayFromRequest($v);
        }
        $user->update($data);
        return back()->with('success', 'Saved.');
    }

    public function destroyContact(Request $request, string $id)
    {
        $contact = $request->user()->contacts()->findOrFail($id);
        $contact->delete();
        return back()->with('success', 'Removed.');
    }
}
