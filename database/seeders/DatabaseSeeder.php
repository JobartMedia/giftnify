<?php

namespace Database\Seeders;

use App\Models\CmsCurrency;
use App\Models\CmsOccasion;
use App\Models\CmsSetting;
use App\Models\PromoCode;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // No default admin with a known password. Create staff with:
        //   php artisan giftnify:make-admin you@company.com
        // Local development only: a throwaway admin.
        if (app()->environment('local')) {
            User::firstOrCreate(
                ['email' => 'admin@giftnify.test'],
                ['name' => 'Local Admin', 'password' => Hash::make('local-only-password'), 'role' => 'admin', 'status' => 'active']
            );
        }

        // Currencies
        $currencies = [
            ['code' => 'USD', 'symbol' => '$', 'name' => 'US Dollar', 'per_usd' => 1.0, 'decimals' => 2],
            ['code' => 'NGN', 'symbol' => '₦', 'name' => 'Nigerian Naira', 'per_usd' => 1550.0, 'decimals' => 0],
            ['code' => 'GBP', 'symbol' => '£', 'name' => 'British Pound', 'per_usd' => 0.78, 'decimals' => 2],
            ['code' => 'EUR', 'symbol' => '€', 'name' => 'Euro', 'per_usd' => 0.92, 'decimals' => 2],
            ['code' => 'CAD', 'symbol' => 'CA$', 'name' => 'Canadian Dollar', 'per_usd' => 1.38, 'decimals' => 2],
        ];

        foreach ($currencies as $c) {
            CmsCurrency::updateOrCreate(['code' => $c['code']], $c);
        }

        // Occasions
        $occasions = [
            ['id' => 'Birthday', 'label' => 'Birthday', 'icon' => 'cake', 'sort_order' => 1],
            ['id' => 'Anniversary', 'label' => 'Anniversary', 'icon' => 'ring', 'sort_order' => 2],
            ['id' => 'Congratulations', 'label' => 'Congratulations', 'icon' => 'celebrate', 'sort_order' => 3],
            ['id' => 'Thank You', 'label' => 'Thank You', 'icon' => 'thanks', 'sort_order' => 4],
            ['id' => 'Romantic', 'label' => 'Romantic', 'icon' => 'heart', 'sort_order' => 5],
            ['id' => 'Just Because', 'label' => 'Just Because', 'icon' => 'sparkle', 'sort_order' => 6],
            ['id' => 'Wedding', 'label' => 'Wedding', 'icon' => 'wedding', 'sort_order' => 7],
            ['id' => 'Graduation', 'label' => 'Graduation', 'icon' => 'graduation', 'sort_order' => 8],
        ];

        foreach ($occasions as $o) {
            CmsOccasion::updateOrCreate(['id' => $o['id']], $o);
        }

        // Settings
        CmsSetting::updateOrCreate(['key' => 'service_fee_rate'], ['value' => 0.02]);
        CmsSetting::updateOrCreate(['key' => 'features'], [
            'value' => [
                'video_messages' => true,
                'voice_messages' => true,
                'promo_codes' => true,
                'giftsense_ai' => true,
            ]
        ]);

        // Sample promo code for testing only — never seeded on the live site
        if (!app()->environment('production')) PromoCode::firstOrCreate(
            ['code' => 'SURPRISE10'],
            [
                'percent_off' => 10,
                'max_uses' => 500,
                'active' => true,
            ]
        );
    }
}
