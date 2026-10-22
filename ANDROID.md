# Giftnify Android app

The Android app is the same Giftnify app as `src/`, packaged with Capacitor. It uses the website's data, so accounts, gifts and wallets match the website.

## Build the APK in Android Studio

You need the latest **Android Studio** (it includes the Android SDK and Java).

1. Unzip `giftnify-android.zip`. You get a `giftnify-android` folder containing `android/` and `node_modules/`. Keep the two folders side by side.
2. In Android Studio choose **File → Open** and pick the **`android`** folder inside it.
3. Wait for **Gradle sync** to finish (bottom status bar). The first sync downloads tools and can take 5–15 minutes.
4. Choose **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
5. When it finishes, click **locate** in the pop-up. The file is `android/app/build/outputs/apk/debug/app-debug.apk`. Copy it to a phone and open it to install (allow "install unknown apps" when asked).

To try it without a phone: **Tools → Device Manager → create a virtual device**, then press the green **Run** button.

## Which website the app talks to

The app gets all its data from the Giftnify website. The address is in:

`android/app/src/main/assets/public/config.js`

```js
window.GIFTNIFY_API_URL = "";   // empty = http://10.0.2.2:8000
```

| You are testing with | Set it to |
| --- | --- |
| The emulator, with the website running on your computer (`start-giftnify.bat`) | leave empty (`http://10.0.2.2:8000` is your computer seen from the emulator) |
| A real phone on the same Wi-Fi as your computer | `"http://YOUR-PC-IP:8000"`, start the site with `php artisan serve --host=0.0.0.0 --port=8000`, and add your PC's IP to `android/app/src/main/res/xml/network_security_config.xml` |
| The live website | `"https://giftnify.app"` (your real address) |

Rebuild the APK after changing it.

## Payments inside the app

Paystack and Flutterwave checkout open inside the app. To come straight back to the app after paying, add your live website's address (without `https://`) to `allowNavigation` in `android/app/src/main/assets/capacitor.config.json`, e.g. `"giftnify.app"`. Otherwise the confirmation opens in the phone's browser.

## Publishing on Google Play

1. Set `GIFTNIFY_API_URL` to the live https website (above) and remove the test entries from `network_security_config.xml`.
2. In `android/app/build.gradle` raise `versionCode` / `versionName` for each release.
3. **Build → Generate Signed App Bundle / APK → Android App Bundle**, create an upload key, and keep it safe (you need the same key for every update).
4. Upload the `.aab` in the Google Play Console.

## Rebuilding from the source code (developers)

From the project root, with Node.js installed:

```bash
npm install --legacy-peer-deps
# set the website address in .env.mobile (VITE_API_URL=https://giftnify.app)
npm run android:sync      # builds the app and copies it into android/
npm run android:open      # opens Android Studio
```

The app id is `app.giftnify` and the name is "Giftnify". Icons and splash screens are in `android/app/src/main/res/`.
