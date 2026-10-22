<?php

/*
 | Which websites may call the API from a browser. The Giftnify app signs in
 | with a bearer token (no cookies), so only its address needs to be listed.
 | Set APP_CLIENT_URLS in .env to the app's address(es), comma-separated.
 */
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', env('APP_CLIENT_URLS', 'http://localhost:3000,http://127.0.0.1:3000'))))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 3600,
    'supports_credentials' => false,
];
