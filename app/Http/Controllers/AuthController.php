<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    public function showLogin(Request $request): Response
    {
        return Inertia::render('Auth/Login', [
            'redirect' => $request->query('redirect', '/'),
        ]);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (Auth::attempt($credentials, $request->boolean('remember'))) {
            $request->session()->regenerate();
            $redirect = $request->input('redirect', '/');
            // Safe URL redirection
            if (!str_starts_with($redirect, '/') || str_starts_with($redirect, '//') || str_contains($redirect, '\\')) {
                $redirect = '/';
            }
            return redirect()->intended($redirect);
        }

        return back()->withErrors([
            'email' => 'These credentials do not match our records.',
        ])->onlyInput('email');
    }

    public function showRegister(Request $request): Response
    {
        return Inertia::render('Auth/Register', [
            'redirect' => $request->query('redirect', '/'),
        ]);
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:80',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'user', // staff are created with: php artisan giftnify:make-admin
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        $redirect = $request->input('redirect', '/');
        if (!str_starts_with($redirect, '/') || str_starts_with($redirect, '//')) {
            $redirect = '/';
        }
        return redirect()->intended($redirect);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home');
    }
}
