<?php

/*
 | Third-party credentials. Read from .env here ONLY, so they keep working after
 | `php artisan config:cache` (env() returns null outside config files once cached).
 */
return [
    'payments' => [
        'paystack_secret_key' => env('PAYSTACK_SECRET_KEY'),
        'paystack_public_key' => env('PAYSTACK_PUBLIC_KEY'),
        'flutterwave_secret_key' => env('FLUTTERWAVE_SECRET_KEY'),
        'flutterwave_webhook_hash' => env('FLUTTERWAVE_WEBHOOK_HASH'),
        'stripe_secret_key' => env('STRIPE_SECRET_KEY'),
        'stripe_webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        // Which provider collects each currency. Paystack is best for NGN (cards, bank transfer, USSD).
        // Flutterwave takes GBP and EUR cards from the diaspora. Paystack USD needs a Zenith USD
        // domiciliary account, so USD defaults to Flutterwave. Leave a currency empty to switch it off.
        'routes' => [
            'NGN' => env('PAYMENT_ROUTE_NGN', 'paystack'),
            'USD' => env('PAYMENT_ROUTE_USD', 'flutterwave'),
            'GBP' => env('PAYMENT_ROUTE_GBP', 'flutterwave'),
            'EUR' => env('PAYMENT_ROUTE_EUR', 'flutterwave'),
            'CAD' => env('PAYMENT_ROUTE_CAD'),
        ],
        // Demo payments mark gifts as paid without charging. Never allowed in production.
        'allow_demo' => env('PAYMENTS_ALLOW_DEMO', env('APP_ENV') !== 'production'),
    ],

    // SMS and WhatsApp delivery (Nigeria-first). Base URL is shown in your Termii dashboard.
    'termii' => [
        'key' => env('TERMII_API_KEY'),
        'base_url' => rtrim(env('TERMII_BASE_URL', 'https://api.ng.termii.com'), '/'),
        'sender_id' => env('TERMII_SENDER_ID', 'Giftnify'),
        // WhatsApp needs a connected WhatsApp device in Termii; set its name here to switch WhatsApp on.
        'whatsapp_device' => env('TERMII_WHATSAPP_DEVICE'),
    ],

    // Email delivery is on when a real mailer is configured (MAIL_MAILER=smtp/resend/postmark/ses).
    'email_delivery' => !in_array(env('MAIL_MAILER', 'log'), ['log', 'array'], true),

    // Front ends allowed to use the API and receive payment redirects (the app). Comma-separated origins.
    'app_clients' => array_values(array_unique(array_merge(array_filter(array_map('trim', explode(',', env('APP_CLIENT_URLS', 'http://localhost:3000,http://127.0.0.1:3000')))), ['https://localhost', 'capacitor://localhost']))),

    'ai' => [
        'key' => env('OPENAI_API_KEY') ?: env('LOVABLE_API_KEY'),
    ],
];
