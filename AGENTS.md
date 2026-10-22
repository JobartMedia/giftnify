<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep responsive icon sizing and shadows in the shared Icon3D component, so every screen uses consistent artwork framing.
- Use semantic global palette tokens and white-dominant shared app surfaces; reserve the dark presentation for recipient reveals.
- Use min-width-zero grid tracks for mixed content rows and small-screen creation tiles to prevent visual collisions without changing gift flows.
- One backend: the Laravel website (app/, routes/, resources/js/) owns the database, payments, delivery, wallet and the /admin staff console. The TanStack app in src/ has no database and never talks to Supabase; it reads and writes only through the website's JSON API (routes/api.php, prefix /api/v1) via src/lib/api.ts.
- App sign-in uses Laravel Sanctum bearer tokens (stored in localStorage "giftnify.token"); browser access is limited to APP_CLIENT_URLS (config/cors.php, config/services.php).
- Staff roles and editable content (occasions, catalogue, currencies, fees, app text, feature switches) live in the website database; the app reads them from GET /api/v1/content with built-in fallbacks, and admin pages in the app forward to the website's /admin.
- Recipients open gifts through /api/v1/gifts/{token}/sealed, which never includes the sender or the value; reveal, reply, code, claim and redeem endpoints mirror the website's reveal page. A verified one-time code gives the app a 30-minute ticket sent as X-Gift-Verification.
- Payments: the app calls /api/v1/checkout/{token}/start with return_to = the app origin; the provider returns to the app's /payment/{reference}, which confirms via /api/v1/payments/{reference}. Webhooks go to the website only.
- Keep shared components identical in both copies (src/components/giftnify/reveal, wallet ↔ resources/js/Components/reveal, wallet), and keep tests/Feature/AppApiTest.php passing so both front ends stay on the same data.
