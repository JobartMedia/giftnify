<?php

namespace App\Http\Middleware;

use App\Models\CmsCurrency;
use App\Models\CmsOccasion;
use App\Models\CmsSetting;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     */
    protected $rootView = 'app';

    /**
     * Define the props that are shared by default.
     */
    public function share(Request $request): array
    {
        $currencies = cache()->remember('cms_currencies', 60, function () {
            return CmsCurrency::where('active', true)->get();
        });

        $occasions = cache()->remember('cms_occasions', 60, function () {
            return CmsOccasion::where('active', true)->orderBy('sort_order')->get();
        });

        $feeRate = (float)(CmsSetting::get('service_fee_rate', 0.02) ?? 0.02);
        $features = (array)(CmsSetting::get('features', [
            'video_messages' => true,
            'voice_messages' => true,
            'promo_codes' => true,
            'giftsense_ai' => true,
        ]) ?? []);

        // Only offer what can really be paid for and delivered right now.
        $payable = \App\Services\PaymentService::payableCurrencies();
        $currencies = $currencies->isEmpty() ? collect() : $currencies->filter(fn ($c) => in_array($c->code, $payable, true))->values();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'role' => $request->user()->role,
                    'preferred_currency' => $request->user()->preferred_currency,
                    'is_staff' => $request->user()->isStaff(),
                    'is_admin' => $request->user()->isAdmin(),
                    'is_finance' => $request->user()->isFinance(),
                    'wallets' => \App\Services\WalletService::balances($request->user()),
                ] : null,
            ],
            'cms' => [
                'delivery_channels' => \App\Services\DeliveryService::availableChannels(),
                'currencies' => $currencies->isNotEmpty() ? $currencies : collect([
                    ['code' => 'USD', 'symbol' => '$', 'name' => 'US Dollar', 'per_usd' => 1.0, 'decimals' => 2],
                    ['code' => 'NGN', 'symbol' => '₦', 'name' => 'Nigerian Naira', 'per_usd' => 1550.0, 'decimals' => 0],
                    ['code' => 'GBP', 'symbol' => '£', 'name' => 'British Pound', 'per_usd' => 0.78, 'decimals' => 2],
                    ['code' => 'EUR', 'symbol' => '€', 'name' => 'Euro', 'per_usd' => 0.92, 'decimals' => 2],
                    ['code' => 'CAD', 'symbol' => 'CA$', 'name' => 'Canadian Dollar', 'per_usd' => 1.38, 'decimals' => 2],
                ])->filter(fn ($c) => in_array($c['code'], $payable, true))->values(),
                'occasions' => $occasions->isEmpty() ? [
                    ['id' => 'Birthday', 'label' => 'Birthday', 'icon' => 'cake'],
                    ['id' => 'Anniversary', 'label' => 'Anniversary', 'icon' => 'ring'],
                    ['id' => 'Congratulations', 'label' => 'Congratulations', 'icon' => 'celebrate'],
                    ['id' => 'Thank You', 'label' => 'Thank You', 'icon' => 'thanks'],
                    ['id' => 'Romantic', 'label' => 'Romantic', 'icon' => 'heart'],
                    ['id' => 'Just Because', 'label' => 'Just Because', 'icon' => 'sparkle'],
                    ['id' => 'Wedding', 'label' => 'Wedding', 'icon' => 'wedding'],
                    ['id' => 'Graduation', 'label' => 'Graduation', 'icon' => 'graduation'],
                ] : $occasions,
                'fee_rate' => $feeRate,
                'features' => $features,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'info' => fn () => $request->session()->get('info'),
            ],
        ];
    }
}
