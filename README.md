# Giftnify

Mystery reveal gifts: a message first, then who sent it and what's inside.

This folder holds **one backend and two front ends** that share the same data:

| Part | Folder | Local address | What it is |
| --- | --- | --- | --- |
| Website + API | `app/`, `routes/`, `resources/js/` | http://localhost:8000 | Laravel 11 + Inertia (React). Owns the database, payments, delivery, wallet and the staff console at `/admin`. |
| App | `src/` | http://localhost:3000 | TanStack Start (React). Has no database: every screen reads and writes through the website's API at `/api/v1`. |

An account, gift, wallet balance, saved contact or admin setting changed in one shows up in the other straight away.

## Run it on Windows (one click)

Double-click **`start-giftnify.bat`**. The first run installs packages, creates the database and builds the website (a few minutes). After that it opens:

- the website at http://localhost:8000
- the app at http://localhost:3000 (in its own window)

You need PHP 8.2+ (Laravel Herd or XAMPP), Composer and Node.js LTS. Without Node.js only the website starts.

Local admin after seeding: **admin@giftnify.test** / **local-only-password** (works on both website and app; staff console at http://localhost:8000/admin). Payments run in test mode locally (no keys needed), so a "paid" gift goes through instantly.

## Run it by hand

```bash
composer install
cp .env.example .env && php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed && php artisan storage:link
npm install --legacy-peer-deps
npm run build                 # website assets
php artisan serve --port=8000 # website + API
npm run app:dev               # app, in a second terminal → http://localhost:3000
```

## How the app talks to the website

- `src/lib/api.ts` is the only data client. It calls `VITE_API_URL` (default `http://localhost:8000`) + `/api/v1/...`.
- Sign-in returns a token (Laravel Sanctum) kept in the browser; it is sent as `Authorization: Bearer …`.
- The website only accepts browser calls from the app addresses in `APP_CLIENT_URLS` (`.env`).
- Payments return the sender to the app's `/payment/<reference>` page when they started in the app.
- Endpoints are listed in `routes/api.php`; tests in `tests/Feature/AppApiTest.php` prove the two stay in sync.

## Checks

```bash
php artisan test     # website + API
npm run test:app     # app unit tests
npm run app:build    # app production build
```

Deployment: see `DEPLOY.md`.
