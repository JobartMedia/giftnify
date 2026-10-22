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
Route::post('/gift/{token}/reply', [RevealController::class, 'reply'])->name('reveal.reply');
Route::post('/gift/{token}/code', [RevealController::class, 'sendCode'])->name('reveal.code');
Route::post('/gift/{token}/code/verify', [RevealController::class, 'verifyCode'])->name('reveal.code.verify');
Route::post('/gift-hint', [GiftController::class, 'hint'])->name('gifts.hint');
Route::post('/gift/redeem', [RedemptionController::class, 'redeem'])->name('reveal.redeem');
Route::post('/gift/verify-bank', [RedemptionController::class, 'verifyBank'])->name('reveal.verify_bank');

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

    // Wallet
    Route::get('/wallet', [WalletController::class, 'index'])->name('wallet.index');
    Route::post('/wallet/withdraw', [WalletController::class, 'withdraw'])->name('wallet.withdraw');
    Route::post('/gift/{token}/claim', [WalletController::class, 'claim'])->name('wallet.claim');
    Route::post('/occasions/contacts', [OccasionsController::class, 'storeContact'])->name('contacts.store');
    Route::delete('/occasions/contacts/{id}', [OccasionsController::class, 'destroyContact'])->name('contacts.destroy');

    // Admin & Staff Area
    Route::middleware('admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/', [AdminController::class, 'dashboard'])->name('dashboard');
        Route::get('/gifts', [AdminController::class, 'gifts'])->name('gifts');
        Route::patch('/gifts/{id}', [AdminController::class, 'updateGiftStatus'])->name('gifts.update');
        Route::get('/payments', [AdminController::class, 'payments'])->name('payments');
        Route::get('/promos', [AdminController::class, 'promos'])->name('promos');
        Route::post('/promos', [AdminController::class, 'storePromo'])->name('promos.store');
        Route::get('/redemptions', [AdminController::class, 'redemptions'])->name('redemptions');
        Route::get('/withdrawals', [AdminController::class, 'withdrawals'])->name('withdrawals');
        Route::patch('/withdrawals/{id}', [AdminController::class, 'updateWithdrawal'])->name('withdrawals.update');
        Route::patch('/redemptions/{id}', [AdminController::class, 'updateRedemptionStatus'])->name('redemptions.update');
    });
});
