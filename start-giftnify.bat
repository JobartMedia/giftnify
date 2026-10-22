@echo off
setlocal EnableExtensions
title Giftnify - website and app
cd /d "%~dp0"

echo.
echo  ==========================================
echo    Giftnify
echo    Website : http://localhost:8000
echo    App     : http://localhost:3000
echo    Both use the same accounts, gifts and wallets.
echo  ==========================================
echo.

rem ---------- Find PHP ----------
set "PHP=php"
where php >nul 2>nul
if errorlevel 1 (
  if exist "C:\xampp\php\php.exe" set "PHP=C:\xampp\php\php.exe"
  for /d %%D in ("C:\laragon\bin\php\php-8*") do if exist "%%D\php.exe" set "PHP=%%D\php.exe"
  for /d %%D in ("%USERPROFILE%\.config\herd\bin\php8*") do if exist "%%D\php.exe" set "PHP=%%D\php.exe"
)
"%PHP%" -v >nul 2>nul
if errorlevel 1 (
  echo [!] PHP 8.2 or newer was not found.
  echo     Install Laravel Herd ^(https://herd.laravel.com/windows^) or XAMPP, then run this file again.
  pause
  exit /b 1
)
for /f "tokens=1,2" %%A in ('call "%PHP%" -v ^| findstr /b "PHP"') do echo  Using %%A %%B

rem ---------- PHP packages ----------
if exist "vendor\autoload.php" (
  echo  PHP packages already installed.
  goto settings
)
where composer >nul 2>nul
if not errorlevel 1 (
  echo  Installing PHP packages...
  call composer install --no-interaction --no-progress
  if errorlevel 1 ( echo [!] composer install failed. & pause & exit /b 1 )
) else (
  if not exist "vendor\autoload.php" (
    echo [!] Composer is not installed and the vendor folder is missing.
    echo     Install Composer from https://getcomposer.org/download/ then run this file again.
    pause
    exit /b 1
  )
  echo  Composer not found - using the existing vendor folder.
)

rem ---------- Settings ----------
:settings
if not exist ".env" (
  copy /y ".env.example" ".env" >nul
  echo  Created .env from .env.example
)
rem The app (localhost:3000) is allowed to call the website's API.
findstr /b /c:"APP_CLIENT_URLS=" ".env" >nul 2>nul
if errorlevel 1 (
  echo.>> ".env"
  echo APP_CLIENT_URLS=http://localhost:3000,http://127.0.0.1:3000>> ".env"
)
findstr /b /c:"APP_KEY=base64:" ".env" >nul 2>nul
if errorlevel 1 "%PHP%" artisan key:generate --force

findstr /b /c:"DB_CONNECTION=sqlite" ".env" >nul 2>nul
if not errorlevel 1 if not exist "database\database.sqlite" type nul > "database\database.sqlite"

if not exist "storage\framework\cache" mkdir "storage\framework\cache"
if not exist "storage\framework\sessions" mkdir "storage\framework\sessions"
if not exist "storage\framework\views" mkdir "storage\framework\views"
if not exist "storage\logs" mkdir "storage\logs"
if not exist "bootstrap\cache" mkdir "bootstrap\cache"

rem ---------- Database ----------
echo  Updating the database...
"%PHP%" artisan migrate --force
if errorlevel 1 ( echo [!] Database update failed. See the message above. & pause & exit /b 1 )
"%PHP%" artisan db:seed --force >nul
"%PHP%" artisan storage:link >nul 2>nul
"%PHP%" artisan optimize:clear >nul

rem ---------- Website and app files ----------
set "APP=0"
where npm >nul 2>nul
if errorlevel 1 goto nonode
if exist "node_modules\@tanstack\react-start\package.json" if exist "node_modules\laravel-vite-plugin\package.json" goto build
echo  Installing website and app packages ^(first run only, a few minutes^)...
call npm install --legacy-peer-deps --no-audit --no-fund
if errorlevel 1 (
  if exist "public\build\manifest.json" (
    echo [!] npm install failed - starting the website only, with the included build.
    goto built
  )
  echo [!] npm install failed - check your internet connection.
  pause
  exit /b 1
)
:build
set "APP=1"
echo  Building the website...
call npm run build
if not errorlevel 1 goto built
if exist "public\build\manifest.json" (
  echo  Build skipped - using the included website build.
  goto built
)
echo [!] Build failed. See the message above.
pause
exit /b 1
:nonode
if exist "public\build\manifest.json" (
  echo  Node.js not found - starting the website only ^(the app needs Node.js^).
  echo  Install the LTS version from https://nodejs.org to run the app too.
  goto built
)
echo [!] Node.js is needed once to build the site. Install the LTS version from https://nodejs.org then run this file again.
pause
exit /b 1
:built
if exist "public\hot" del "public\hot"

rem ---------- Start ----------
echo.
echo  Website: http://localhost:8000
if "%APP%"=="1" (
  echo  App:     http://localhost:3000  ^(opens in its own window^)
  start "Giftnify app - localhost:3000" cmd /k "set VITE_API_URL=http://localhost:8000&& npm run app:dev"
)
echo  Keep this window open. Close it to stop the website.
echo.
start "" "http://localhost:8000"
if "%APP%"=="1" (
  timeout /t 6 /nobreak >nul
  start "" "http://localhost:3000"
)
"%PHP%" artisan serve --host=127.0.0.1 --port=8000
