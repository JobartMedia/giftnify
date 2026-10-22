<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#ffffff">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="description" content="Send mystery gifts with a personal video, voice note or letter. The sender and the gift stay hidden until the message plays.">
    <title inertia>Giftnify — More than a gift. It's a feeling.</title>

    <link rel="icon" href="/favicon.ico" type="image/x-icon">
    <!-- Installable app: same site, same data -->
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="Giftnify">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta property="og:site_name" content="Giftnify">
    <meta property="og:type" content="website">
    <meta property="og:title" content="Giftnify — More than a gift. It's a feeling.">
    <meta property="og:description" content="Send mystery gifts with a personal video, voice note or letter. The sender and the gift stay hidden until the message plays.">
    <meta property="og:image" content="{{ url('/og-image.png') }}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="{{ url('/og-image.png') }}">

    <!-- Bricolage Grotesque (display) + Manrope (text) — same pair as the app -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @inertiaHead
</head>
<body class="h-full bg-white text-ink font-sans antialiased">
    @inertia
</body>
</html>
