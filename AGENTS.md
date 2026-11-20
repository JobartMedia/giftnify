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
- Mystery features: reveal_mode classic|guess|anonymous. Guess answers are encrypted and never sent to clients; hints release one per wrong guess (3 tries) via POST /gift/{token}/guess and /api/v1/gifts/{token}/guess; the game is skippable and runs before the message. Locked gifts (unlock_at in the future) return no content until unlocked; `giftnify:release-scheduled` (every minute) sends the real notification. Notifications never include the amount; value_teaser=figures adds "It's a N-figure gift."
- Creator gift links: /@{username} (public page and wall of fan notes, never amounts) and /creator (setup, QR, received gifts). A creator gift is delivered by email to the creator's account and only that account can claim it.
- Birthday leaderboard: /leaderboard (website) and /leaderboard (app) share src/components/giftnify/leaderboard ↔ resources/js/Components/leaderboard (keep identical). Data from GET /api/v1/leaderboard; birthday via POST /leaderboard/birthday or /api/v1/me/birthday. Only day + month are stored and they lock once set. App\Services\Leaderboard scores gifts that land in the birthday week (±3 days): 10 pts each + value bonus capped at 40, max 3 gifts per sender; never returns amounts or contacts; cached 10 minutes.
- Birthdays and contacts: sign-up (web /register and POST /api/v1/auth/register) takes phone and birthday (day + month, locked). Contacts match people on Giftnify by email or phone_key (last 10 digits) and use their birthday when they allow it (birthday_visible). App\Services\BirthdayBook resolves dates; bulk import via POST /occasions/contacts/import and /api/v1/contacts/import; shared importer at src/components/giftnify/contacts ↔ resources/js/Components/contacts (keep identical). `giftnify:birthday-reminders` runs daily at 08:00 Lagos and emails 7 days and 1 day before, logged in birthday_reminder_log. The Android app reads contacts with @capacitor-community/contacts (READ_CONTACTS).
