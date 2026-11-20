<?php

namespace App\Http\Controllers;

use App\Models\GoogleConnection;
use App\Models\User;
use App\Services\BirthdayBook;
use App\Services\GoogleService;
use App\Services\GoogleSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\URL;

/**
 * Connect Google Contacts and Google Calendar. Works from the website (session)
 * and the app (Sanctum token; Google's sign-in opens in the phone's browser).
 */
class GoogleController extends Controller
{
    private function features(Request $request): array
    {
        $want = (string)$request->input('want', 'both');
        return match ($want) {
            'contacts' => ['contacts'],
            'calendar' => ['calendar'],
            default => ['contacts', 'calendar'],
        };
    }

    public static function statusFor(?User $user): array
    {
        $conn = $user ? GoogleConnection::where('user_id', $user->id)->first() : null;
        return ['available' => GoogleSettings::configured()] + ($conn ? $conn->summary() : ['connected' => false]);
    }

    /** Website: go to Google. */
    public function connect(Request $request)
    {
        if (!GoogleSettings::configured()) {
            return redirect('/occasions')->with('error', 'Google isn\'t set up on Giftnify yet.');
        }
        return redirect()->away(GoogleService::authUrl($request->user(), $this->features($request), 'web'));
    }

    /** App: a short-lived link that signs in on the website and goes to Google, opened in the phone's browser. */
    public function appLink(Request $request)
    {
        abort_unless(GoogleSettings::configured(), 503, 'Google isn\'t set up on Giftnify yet.');
        return response()->json(['url' => URL::temporarySignedRoute('google.app-start', now()->addMinutes(10), [
            'user' => $request->user()->id, 'want' => (string)$request->input('want', 'both'),
        ])]);
    }

    public function appStart(Request $request, string $user)
    {
        $u = User::findOrFail($user);
        Auth::guard('web')->login($u);
        $request->session()->regenerate();
        return redirect()->away(GoogleService::authUrl($u, $this->features($request), 'app'));
    }

    public function callback(Request $request)
    {
        $state = GoogleService::readState($request->query('state'));
        if (!$state) return redirect('/occasions')->with('error', 'That Google sign-in expired. Try again.');
        $back = fn (string $msg, bool $ok = true, string $q = '') => $state['r'] === 'app'
            ? response()->view('google-done', ['ok' => $ok, 'message' => $msg])
            : redirect('/occasions' . $q)->with($ok ? 'success' : 'error', $msg);

        if ($request->query('error')) return $back('Google wasn\'t connected.', false);

        $user = User::find($state['u']);
        if (!$user || ($request->user() && $request->user()->id !== $user->id)) {
            return $back('Sign in with the same Giftnify account and try again.', false);
        }

        try {
            $conn = GoogleService::finish($user, (string)$request->query('code'), $state['f']);
        } catch (\Throwable $e) {
            return $back($e->getMessage(), false);
        }

        $missing = [];
        if (in_array('contacts', $state['f'], true) && !$conn->has(GoogleConnection::CONTACTS)) $missing[] = 'Contacts';
        if (in_array('calendar', $state['f'], true) && !$conn->has(GoogleConnection::CALENDAR)) $missing[] = 'Calendar';

        if ($conn->calendar_enabled) {
            try { GoogleService::syncCalendar($conn); } catch (\Throwable $e) { $conn->update(['last_error' => mb_substr($e->getMessage(), 0, 300)]); }
        }

        $msg = $missing
            ? 'Connected, but Google ' . implode(' and ', $missing) . ' wasn\'t allowed. Tick the box on Google\'s screen to use it.'
            : 'Google connected.';
        return $back($msg, true, in_array('contacts', $state['f'], true) && $conn->has(GoogleConnection::CONTACTS) ? '?google=contacts' : '');
    }

    public function status(Request $request)
    {
        return response()->json(self::statusFor($request->user()));
    }

    /** Google Contacts for the tick-who-to-add list (nothing is saved here). */
    public function contacts(Request $request)
    {
        $conn = GoogleConnection::where('user_id', $request->user()->id)->first();
        if (!$conn || !$conn->has(GoogleConnection::CONTACTS)) {
            return response()->json(['message' => 'Connect Google Contacts first.'], 409);
        }
        try {
            return response()->json(['contacts' => GoogleService::contacts($conn)]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }
    }

    /** Turn the Giftnify Birthdays calendar on or off. */
    public function calendar(Request $request)
    {
        $on = $request->boolean('enabled');
        $conn = GoogleConnection::where('user_id', $request->user()->id)->first();
        if ($on && (!$conn || !$conn->has(GoogleConnection::CALENDAR))) {
            return response()->json(['needs_connect' => true], 409);
        }
        if (!$conn) return response()->json(self::statusFor($request->user()));
        try {
            if ($on) {
                $conn->update(['calendar_enabled' => true]);
                GoogleService::syncCalendar($conn);
            } else {
                GoogleService::stopCalendar($conn);
            }
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()] + self::statusFor($request->user()), 502);
        }
        return response()->json(self::statusFor($request->user()));
    }

    public function sync(Request $request)
    {
        $conn = GoogleConnection::where('user_id', $request->user()->id)->where('calendar_enabled', true)->firstOrFail();
        try {
            GoogleService::syncCalendar($conn);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()] + self::statusFor($request->user()), 502);
        }
        return response()->json(self::statusFor($request->user()));
    }

    public function disconnect(Request $request)
    {
        $conn = GoogleConnection::where('user_id', $request->user()->id)->first();
        if ($conn) GoogleService::disconnect($conn);
        return response()->json(self::statusFor($request->user()));
    }

    /** From a calendar event: start a gift for this person, set to open on the day. */
    public function gift(Request $request, string $contact)
    {
        $p = BirthdayBook::people($request->user())->firstWhere('id', $contact);
        return $p ? redirect(BirthdayBook::giftLink($p)) : redirect('/create');
    }
}
