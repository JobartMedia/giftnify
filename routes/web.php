<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GiftController;
use App\Http\Controllers\GiftSenseController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\OccasionsController;
use App\Http\Controllers\PasswordController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\RedemptionController;
use App\Http\Controllers\RevealController;
use App\Http\Controllers\WalletController;
use Illuminate\Support\Facades\Route;

// Public Static & Information Pages
Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/demo', [HomeController::class, 'demo'])->name('demo');
Route::get('/help', [HomeController::class, 'help'])->name('help');
Route::get('/privacy', [HomeController::class, 'privacy'])->name('privacy');
Route::get('/terms', [HomeController::class, 'terms'])->name('terms');

// Gift Creation Wizard (Public draftable, auth validated on submit)
Route::get('/create', [GiftController::class, 'create'])->name('gifts.create');
Route::post('/create', [GiftController::class, 'store'])->name('gifts.store');

// Gift Checkout & Payments
Route::get('/payment/callback/{reference}', [PaymentController::class, 'callback'])->name('payments.callback');

// Public Mystery Reveal & Redemption (Tokens can be opened by anyone with the link)
Route::get('/gift/{token}', [RevealController::class, 'show'])->name('reveal.show');
Route::post('/gift/{token}/status', [RevealController::class, 'updateStatus'])->name('reveal.status');
Route::post('/gift/{token}/reveal', [RevealController::class, 'reveal'])->name('reveal.open');
Route::post('/gift/{token}/guess', [RevealController::class, 'guess'])->name('reveal.guess');
Route::post('/gift/{token}/reply', [RevealController::class, 'reply'])->name('reveal.reply');
Route::post('/gift/{token}/code', [RevealController::class, 'sendCode'])->name('reveal.code');
Route::post('/gift/{token}/code/verify', [RevealController::class, 'verifyCode'])->name('reveal.code.verify');
Route::post('/gift-hint', [GiftController::class, 'hint'])->name('gifts.hint');
Route::post('/gift/redeem', [RedemptionController::class, 'redeem'])->name('reveal.redeem');
Route::post('/gift/verify-bank', [RedemptionController::class, 'verifyBank'])->name('reveal.verify_bank');

// Creator gift links: giftnify.app/@name
Route::get('/@{username}', [\App\Http\Controllers\CreatorController::class, 'show'])
    ->where('username', '[A-Za-z0-9_]{3,30}')->name('creator.show');

// Google Contacts + Calendar
Route::get('/integrations/google/callback', [\App\Http\Controllers\GoogleController::class, 'callback'])->name('google.callback');
Route::get('/integrations/google/app/{user}', [\App\Http\Controllers\GoogleController::class, 'appStart'])->middleware('signed')->name('google.app-start');

// Birthday leaderboard (public board; your rank needs sign-in)
Route::get('/leaderboard', [\App\Http\Controllers\LeaderboardController::class, 'index'])->name('leaderboard');

// GiftSense AI
Route::get('/giftsense', [GiftSenseController::class, 'index'])->name('giftsense.index');
Route::post('/giftsense/generate', [GiftSenseController::class, 'generate'])->name('giftsense.generate');
Route::post('/giftsense/write-message', [GiftSenseController::class, 'writeMessage'])->name('giftsense.write_message');

// Occasions & Calendar
Route::get('/occasions', [OccasionsController::class, 'index'])->name('occasions.index');

// Auth Routes
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::get('/forgot-password', [PasswordController::class, 'showForgot'])->name('password.request');
    Route::post('/forgot-password', [PasswordController::class, 'sendLink'])->middleware('throttle:5,1')->name('password.email');
    Route::get('/reset-password/{token}', [PasswordController::class, 'showReset'])->name('password.reset');
    Route::post('/reset-password', [PasswordController::class, 'reset'])->middleware('throttle:10,1')->name('password.update');
});

Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');

// Authenticated User Routes
Route::middleware('auth')->group(function () {
    Route::get('/activity', [GiftController::class, 'index'])->name('gifts.index');

    // Checkout needs an account so the sender can track the gift and read replies
    Route::get('/checkout/{token}', [PaymentController::class, 'checkout'])->name('gifts.checkout');
    Route::post('/checkout/{token}/quote', [PaymentController::class, 'quote'])->name('gifts.quote');
    Route::post('/payment/start', [PaymentController::class, 'start'])->name('payments.start');
    Route::get('/gifts/{token}/success', [PaymentController::class, 'success'])->name('gifts.success');

    // My gift link (creator)
    Route::get('/creator', [\App\Http\Controllers\CreatorController::class, 'edit'])->name('creator.edit');
    Route::post('/creator', [\App\Http\Controllers\CreatorController::class, 'update'])->name('creator.update');
    Route::post('/leaderboard/birthday', [\App\Http\Controllers\LeaderboardController::class, 'birthday'])->middleware('throttle:20,1')->name('leaderboard.birthday');
    Route::post('/creator/gifts/{token}/wall', [\App\Http\Controllers\CreatorController::class, 'wall'])->name('creator.wall');

    // Wallet
    Route::get('/wallet', [WalletController::class, 'index'])->name('wallet.index');
    Route::post('/wallet/withdraw', [WalletController::class, 'withdraw'])->name('wallet.withdraw');
    Route::post('/gift/{token}/claim', [WalletController::class, 'claim'])->name('wallet.claim');
    Route::post('/occasions/contacts', [OccasionsController::class, 'storeContact'])->name('contacts.store');
    Route::post('/occasions/contacts/import', [OccasionsController::class, 'import'])->middleware('throttle:10,1')->name('contacts.import');
    Route::get('/integrations/google/connect', [\App\Http\Controllers\GoogleController::class, 'connect'])->name('google.connect');
    Route::get('/integrations/google/contacts', [\App\Http\Controllers\GoogleController::class, 'contacts'])->middleware('throttle:10,1');
    Route::post('/integrations/google/calendar', [\App\Http\Controllers\GoogleController::class, 'calendar'])->middleware('throttle:10,1');
    Route::post('/integrations/google/sync', [\App\Http\Controllers\GoogleController::class, 'sync'])->middleware('throttle:6,1');
    Route::delete('/integrations/google', [\App\Http\Controllers\GoogleController::class, 'disconnect']);
    Route::get('/occasions/gift/{contact}', [\App\Http\Controllers\GoogleController::class, 'gift'])->name('occasions.gift');
    Route::post('/occasions/settings', [OccasionsController::class, 'settings'])->name('occasions.settings');
    Route::delete('/occasions/contacts/{id}', [OccasionsController::class, 'destroyContact'])->name('contacts.destroy');

    // Admin & Staff Area
    Route::middleware('admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/', [AdminController::class, 'dashboard'])->name('dashboard');
        Route::get('/gifts', [AdminController::class, 'gifts'])->name('gifts');
        Route::patch('/gifts/{id}', [AdminController::class, 'updateGiftStatus'])->name('gifts.update');
        Route::get('/payments', [AdminController::class, 'payments'])->name('payments');
        Route::get('/settings/payments', [AdminController::class, 'paymentSettings'])->name('settings.payments');
        Route::post('/settings/payments', [AdminController::class, 'savePaymentSettings'])->name('settings.payments.save');
        Route::get('/settings/google', [AdminController::class, 'googleSettings'])->name('settings.google');
        Route::post('/settings/google', [AdminController::class, 'saveGoogleSettings'])->name('settings.google.save');
        Route::post('/settings/payments/check', [AdminController::class, 'checkPaystack'])->middleware('throttle:10,1')->name('settings.payments.check');
        Route::get('/promos', [AdminController::class, 'promos'])->name('promos');
        Route::post('/promos', [AdminController::class, 'storePromo'])->name('promos.store');
        Route::get('/redemptions', [AdminController::class, 'redemptions'])->name('redemptions');
        Route::get('/withdrawals', [AdminController::class, 'withdrawals'])->name('withdrawals');
        Route::patch('/withdrawals/{id}', [AdminController::class, 'updateWithdrawal'])->name('withdrawals.update');
        Route::post('/withdrawals/{id}/send', [AdminController::class, 'sendWithdrawal'])->middleware('throttle:30,1')->name('withdrawals.send');
        Route::post('/withdrawals/{id}/verify', [AdminController::class, 'verifyWithdrawal'])->middleware('throttle:30,1')->name('withdrawals.verify');
        Route::patch('/redemptions/{id}', [AdminController::class, 'updateRedemptionStatus'])->name('redemptions.update');
    });
});
