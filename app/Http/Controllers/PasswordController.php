<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Inertia\Inertia;
use Inertia\Response;

class PasswordController extends Controller
{
    public function showForgot(): Response
    {
        return Inertia::render('Auth/ForgotPassword', [
            'email_ready' => (bool)config('services.email_delivery'),
        ]);
    }

    public function sendLink(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        // Same answer whether or not the email exists, so accounts can't be discovered.
        try {
            Password::sendResetLink($request->only('email'));
        } catch (\Throwable $e) {
            report($e);
            return back()->with('error', "We couldn't send the email right now. Try again in a few minutes.");
        }
        return back()->with('success', 'If that email has an account, a reset link is on its way.');
    }

    public function showReset(Request $request, string $token): Response
    {
        return Inertia::render('Auth/ResetPassword', [
            'token' => $token,
            'email' => (string)$request->query('email', ''),
        ]);
    }

    public function reset(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill(['password' => Hash::make($password), 'remember_token' => Str::random(60)])->save();
                event(new PasswordReset($user));
            }
        );

        return $status === Password::PASSWORD_RESET
            ? redirect()->route('login')->with('success', 'Password changed. Sign in with your new password.')
            : back()->withErrors(['email' => 'This reset link is invalid or has expired. Ask for a new one.']);
    }
}
