<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * On public API routes (opening a gift), a signed-in app user is recognised
 * from their token, so e.g. the reveal can credit their wallet. No token is fine.
 */
class OptionalApiUser
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->bearerToken() && ($user = Auth::guard('sanctum')->user())) {
            Auth::setUser($user);
            $request->setUserResolver(fn () => $user);
        }
        return $next($request);
    }
}
