<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OccasionsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $contacts = $user ? Contact::where('user_id', $user->id)->orderBy('name')->get() : [];

        return Inertia::render('Occasions/Index', [
            'contacts' => $contacts,
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

        $request->user()->contacts()->create($validated);
        return back()->with('success', 'Contact saved successfully.');
    }

    public function destroyContact(Request $request, string $id)
    {
        $contact = $request->user()->contacts()->findOrFail($id);
        $contact->delete();
        return back()->with('success', 'Contact removed.');
    }
}
