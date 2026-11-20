<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Giftnify</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#FFF4FA;color:#251522;padding:24px}
.c{max-width:380px;text-align:center;background:#fff;border-radius:28px;padding:36px 28px;box-shadow:0 12px 40px rgba(229,0,125,.12)}
h1{font-size:24px;margin:14px 0 8px}p{color:#6E5A68;line-height:1.55;margin:0}.i{font-size:44px}</style></head>
<body><div class="c"><div class="i">{{ $ok ? '🎉' : '⚠️' }}</div><h1>{{ $ok ? 'All set' : 'Not connected' }}</h1>
<p>{{ $message }}</p><p style="margin-top:14px;font-weight:700;color:#251522">Go back to the Giftnify app and pull down to refresh.</p></div></body></html>
