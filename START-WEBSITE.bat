@echo off
setlocal EnableExtensions
title Giftnify website - http://localhost:8000
cd /d "%~dp0"

echo.
echo  ==========================================
echo    Giftnify website (local test copy)
echo    Version: 19 Nov 2026 - real logo, Giftnified sound, 8-second countdown
echo  ==========================================
echo.

rem ---------- Find PHP ----------
set "PHP=php"
where php >nul 2>nul
if errorlevel 1 (
  if exist "C:\xampp\php\php.exe" set "PHP=C:\xampp\php\php.exe"
  for /d %%D in ("C:\laragon\bin\php\php-8*") do if exist "%%D\php.exe" set "PHP=%%D\php.exe"
  for /d %%D in ("%USERPROFILE%\.config\herd\bin\php8*") do if exist "%%D\php.exe" set "PHP=%%D\php.exe"
  for /d %%D in ("%USERPROFILE%\.config\herd-lite\bin") do if exist "%%D\php.exe" set "PHP=%%D\php.exe"
)
"%PHP%" -v >nul 2>nul
if errorlevel 1 (
  echo [!] PHP 8.2 or newer was not found on this computer.
  echo     Install Laravel Herd from https://herd.laravel.com/windows
  echo     then close this window and run START-WEBSITE.bat again.
  pause
  exit /b 1
)
for /f "tokens=1,2" %%A in ('call "%PHP%" -v ^| findstr /b "PHP"') do echo  Using %%A %%B

"%PHP%" -r "exit(extension_loaded('pdo_sqlite') ? 0 : 1);"
if errorlevel 1 (
  echo [!] Your PHP is missing the SQLite extension.
  echo     XAMPP: open C:\xampp\php\php.ini, remove the ; before extension=pdo_sqlite and extension=sqlite3, save, and run this again.
  echo     Or install Laravel Herd, which includes it.
  pause
  exit /b 1
)

rem ---------- First-run housekeeping ----------
for %%F in (storage\framework\cache storage\framework\sessions storage\framework\views storage\logs bootstrap\cache) do if not exist "%%F" mkdir "%%F"
"%PHP%" artisan optimize:clear >nul 2>nul
"%PHP%" artisan migrate --force >nul
if not exist "public\storage" "%PHP%" artisan storage:link >nul 2>nul

rem ---------- Port: never fall back silently to an old copy ----------
rem If another Giftnify (an older copy) is still running, the browser would show that one.
set "PORT="
for %%P in (8000 8001 8002 8003 8004 8005) do if not defined PORT (
  "%PHP%" -r "$s=@fsockopen('127.0.0.1',%%P,$e,$m,0.3); exit($s?1:0);"
  if not errorlevel 1 set "PORT=%%P"
)
if not defined PORT set "PORT=8010"
if not "%PORT%"=="8000" (
  echo.
  echo  [!] Something else is already using http://localhost:8000
  echo      - probably an OLDER Giftnify window that is still open.
  echo      Close any other black Giftnify windows to stop it.
  echo      This copy will run on http://localhost:%PORT% instead.
)

echo.
echo  Opening http://localhost:%PORT% in your browser.
echo  Keep this window open while you test. Close it to stop the website.
echo.
start "" "http://localhost:%PORT%"
"%PHP%" artisan serve --host=127.0.0.1 --port=%PORT%
