<?php

use App\Http\Controllers\Api\AppApiController;
use App\Http\Controllers\GiftController;
use App\Http\Controllers\GiftSenseController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\RedemptionController;
use App\Http\Controllers\RevealController;
use App\Http\Controllers\WalletController;
use App\Http\Middleware\OptionalApiUser;
use Illuminate\Support\Facades\Route;

// Public payment webhooks (exempt from CSRF)
Route::post('/webhook/{provider}', [PaymentController::class, 'webhook'])->name('api.webhook');
Route::post('/public/payments/webhook/{provider}', [PaymentController::class, 'webhook'])->name('api.public_webhook');

/*
 | App API (v1) — the Giftnify app reads and writes the same data as the website.
 | Sign-in returns a token; send it as "Authorization: Bearer <token>".
 */
Route::prefix('v1')->name('api.v1.')->middleware(OptionalApiUser::class)->group(function () {
    // Accounts
    Route::post('/auth/register', [AppApiController::class, 'register'])->middleware('throttle:10,1');
    Route::post('/auth/login', [AppApiController::class, 'login'])->middleware('throttle:20,1');
    Route::post('/auth/forgot-password', [AppApiController::class, 'forgotPassword'])->middleware('throttle:5,1');

    // Shared content
    Route::get('/content', [AppApiController::class, 'content']);
    Route::get('/banks', [AppApiController::class, 'banks']);
    Route::post('/support', [AppApiController::class, 'support']);

    // AI helpers
    Route::post('/ai/write-message', [GiftSenseController::class, 'writeMessage']);
    Route::post('/ai/ideas', [GiftSenseController::class, 'generate']);
    Route::post('/ai/hint', [GiftController::class, 'hint']);

    // Opening a gift (anyone with the link)
    Route::get('/gifts/{token}/sealed', [RevealController::class, 'showJson']);
    Route::post('/gifts/{token}/status', [RevealController::class, 'updateStatus']);
    Route::post('/gifts/{token}/reveal', [RevealController::class, 'reveal']);
    Route::post('/gifts/{token}/reply', [RevealController::class, 'reply']);
    Route::post('/gifts/{token}/code', [RevealController::class, 'sendCode']);
    Route::post('/gifts/{token}/code/verify', [RevealController::class, 'verifyCode']);
    Route::post('/redeem', [RedemptionController::class, 'redeem']);
    Route::post('/verify-bank', [RedemptionController::class, 'verifyBank']);

    // Signed in
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AppApiController::class, 'logout']);
        Route::get('/me', [AppApiController::class, 'showMe']);
        Route::patch('/me', [AppApiController::class, 'updateMe']);

        Route::get('/gifts', [AppApiController::class, 'myGifts']);
        Route::post('/gifts', [GiftController::class, 'store'])->middleware('throttle:20,1');
        Route::post('/promo/check', [AppApiController::class, 'checkPromo']);
        Route::post('/checkout/{token}/quote', [PaymentController::class, 'quote']);
        Route::post('/checkout/{token}/start', [PaymentController::class, 'apiStart']);
        Route::get('/payments/{reference}', [PaymentController::class, 'apiStatus']);

        Route::get('/wallet', [WalletController::class, 'show']);
        Route::post('/wallet/withdraw', [WalletController::class, 'withdraw']);
        Route::post('/gifts/{token}/claim', [WalletController::class, 'claim']);

        Route::get('/contacts', [AppApiController::class, 'contacts']);
        Route::post('/contacts', [AppApiController::class, 'storeContact']);
        Route::delete('/contacts/{id}', [AppApiController::class, 'destroyContact']);
    });
});
