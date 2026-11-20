<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Vite;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Behind a load balancer or Cloudflare, build https links (gift links, reset emails).
        if ($this->app->environment('production')) {
            \Illuminate\Support\Facades\URL::forceScheme('https');
        }
        Vite::prefetch(concurrency: 3);

        // Windows PHP (XAMPP and similar) often has no list of trusted certificates, so every
        // https call to Paystack fails with "cURL error 60". Use the bundled list in that case.
        if (!ini_get('curl.cainfo') && !ini_get('openssl.cafile') && is_file(resource_path('certs/cacert.pem'))) {
            \Illuminate\Support\Facades\Http::globalOptions(['verify' => resource_path('certs/cacert.pem')]);
        }

        // Payment keys saved in the staff console override .env.
        \App\Services\PaymentSettings::apply();
        \App\Services\GoogleSettings::apply();
    }
}
