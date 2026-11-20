# Deploying Giftnify

The website is a Laravel 11 + Inertia (React) app and is also the API for the Giftnify app in `src/`. Deploy the website first (sections 1–7), then the app (section 8).

## 1. What you need first

| Item | Where | Notes |
| --- | --- | --- |
| Server | A VPS with PHP 8.2+ (DigitalOcean, Hetzner, AWS Lightsail) managed by Laravel Forge or Ploi, or Laravel Cloud | Shared cPanel hosting works too (section 6), but background jobs are harder. |
| Database | MySQL 8 or PostgreSQL 15 | Do not use SQLite in production. |
| Domain + HTTPS | Your DNS; Let's Encrypt via Forge/Ploi, or Cloudflare | Payment providers require https webhooks. |
| Paystack live keys | dashboard.paystack.com → Settings → API Keys & Webhooks | Needs business compliance approved. |
| Flutterwave live keys | app.flutterwave.com → Settings → API | Optional at launch; needed for GBP/EUR/USD. |
| Termii API key + sender ID | termii.com | Sender ID approval can take a few days. |
| Email sending | Any SMTP provider (Zoho, Resend, Postmark, Brevo, Mailgun) | Needed for gift emails, alerts, codes and password resets. |

## 2. First deploy

```bash
git clone <your-repo> giftnify && cd giftnify
composer install --no-dev --optimize-autoloader
npm ci --legacy-peer-deps && npm run build
cp .env.example .env
php artisan key:generate
```

Edit `.env` for production:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://giftnify.app
LOG_LEVEL=warning
PAYMENTS_ALLOW_DEMO=false

DB_CONNECTION=mysql
DB_HOST=...
DB_DATABASE=giftnify
DB_USERNAME=...
DB_PASSWORD=...

QUEUE_CONNECTION=database
CACHE_STORE=database
SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true

PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
MAIL_MAILER=smtp
MAIL_HOST=...
TERMII_API_KEY=...
```

Then:

```bash
php artisan migrate --force
php artisan db:seed --force          # currencies, occasions, settings (no admin, no test promo in production)
php artisan storage:link
php artisan giftnify:make-admin you@yourcompany.com --role=admin
php artisan config:cache && php artisan route:cache && php artisan view:cache
```

Point the web server's document root at `public/`.

## 3. Background worker

Gift delivery, sender alerts and retries run as queued jobs. Keep one worker running (Forge/Ploi: add a daemon):

```bash
php artisan queue:work --tries=5 --backoff=30 --max-time=3600
```

Restart it after every deploy: `php artisan queue:restart`.

### Scheduler (scheduled "Birthday Bomb" gifts)

Gifts set to open at a later time are released by `php artisan giftnify:release-scheduled`, which the scheduler runs every minute. Add this one cron line (Forge/Ploi: enable the scheduler):

```bash
* * * * * cd /path/to/giftnify && php artisan schedule:run >> /dev/null 2>&1
```

The same cron also sends birthday reminder emails every morning at 8am (Lagos time), 7 days and 1 day before the birthdays of people each user has saved. Email must be set up (MAIL_* in `.env`).

Without it, the teaser ("Something is coming…") still goes out, but the real gift notification is never sent at the unlock time. The recipient's link still opens itself when the countdown ends.

Uploaded profile photos for creator gift links live on the `public` disk, so run `php artisan storage:link` once.

## 4. Payment webhooks

| Provider | Webhook URL | Where to paste it |
| --- | --- | --- |
| Paystack | `https://giftnify.app/api/webhook/paystack` | Settings → API Keys & Webhooks |
| Flutterwave | `https://giftnify.app/api/webhook/flutterwave` | Settings → Webhooks (also set a secret hash = `FLUTTERWAVE_WEBHOOK_HASH`) |

Test each in **test mode first**: pay with a test card, confirm the gift turns "Sent" and the delivery message arrives. Then switch to live keys.

## 5. Every later deploy

```bash
git pull
composer install --no-dev --optimize-autoloader
npm ci --legacy-peer-deps && npm run build
php artisan migrate --force
php artisan config:cache && php artisan route:cache && php artisan view:cache
php artisan queue:restart
```

## 6. cPanel (shared hosting)

1. Upload the project above `public_html`; make `public_html` point to (or contain) the `public/` folder.
2. Build assets on your computer (`npm run build`) and upload `public/build`.
3. Use cPanel's terminal or SSH for the `php artisan` commands above.
4. No long-running worker: set `QUEUE_CONNECTION=sync` (messages send during the request), or add a cron every minute:
   `* * * * * cd ~/giftnify && php artisan queue:work --stop-when-empty --tries=5 >/dev/null 2>&1`
5. Add the scheduler cron too (needed for scheduled gifts):
   `* * * * * cd ~/giftnify && php artisan schedule:run >/dev/null 2>&1`

## 7. Before you announce it

- [ ] `APP_DEBUG=false`, `PAYMENTS_ALLOW_DEMO=false`
- [ ] A real payment in each live currency, then a refund from the provider dashboard
- [ ] Gift delivered by SMS, by email and by link
- [ ] Recipient code arrives; payout to a real bank account name is confirmed
- [ ] Password reset email arrives
- [ ] Daily database backups switched on (Forge/Ploi backups, or your host's)
- [ ] Error alerts (Sentry, Flare or your host's) and an uptime monitor
- [ ] `php artisan test` passes
- [ ] If the app is live: `APP_CLIENT_URLS` lists only its real address, and a gift made in the app shows on the website

## 8. The app (`src/`)

The app has no database or secrets of its own; it only needs to know the website's address.

1. Pick its address, e.g. `https://app.giftnify.app`.
2. On the **website**, add it to `.env` and re-cache config:
   ```dotenv
   APP_CLIENT_URLS=https://app.giftnify.app
   ```
   `php artisan config:cache`
3. Build the app with the website's address:
   ```bash
   VITE_API_URL=https://giftnify.app npm run app:build
   ```
4. Run `dist/server/server.js` on any Node 20+ host (Railway, Render, Fly.io, a VPS with pm2), or deploy the folder to Cloudflare Workers / Netlify with the TanStack Start adapter.
5. Check: sign in on the app with a website account, send a test gift, confirm it appears on the website's "My gifts" page.

Payment webhooks always go to the **website** URLs in section 4, even for gifts paid from the app.

If you don't need a separate app yet, skip this section: the website is already installable on phones (Add to Home Screen) and has every feature.


## Google Contacts & Calendar (optional)

Lets people import Google Contacts (with birthdays) and get a "Giftnify Birthdays" calendar with reminders a week and a day before. Nothing shows to users until keys are saved.

1. console.cloud.google.com → new project "Giftnify".
2. APIs & Services → Library → enable **People API** and **Google Calendar API**.
3. Google Auth Platform → Branding: app name, logo, support email, privacy policy URL, home page. Data access → add scopes `.../auth/contacts.readonly` and `.../auth/calendar.app.created`.
4. Clients → Create client → Web application:
   - Authorised JavaScript origin: `https://your-domain`
   - Authorised redirect URI: `https://your-domain/integrations/google/callback`
5. Paste the client ID and secret into **Admin → Google** (stored encrypted), or set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env`.
6. Until Google verifies the app, only test users you add under Audience (max 100) can connect. Submit for verification before launch: contacts and calendar are "sensitive" scopes, so Google reviews the privacy policy and a short demo video (usually a few days to a few weeks; no paid security audit is needed for these scopes).

The scheduler cron runs `giftnify:google-sync` daily at 03:30 to keep calendars current. The Android app opens Google's sign-in in the phone's browser (Google blocks sign-in inside apps); people return to the app and it refreshes.
