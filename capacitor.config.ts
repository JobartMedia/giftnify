import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Giftnify Android app (and iPhone later): the same app as src/, packaged
 * as a phone app with Capacitor. Build steps are in ANDROID.md.
 *
 * The website's address is set at build time (GIFTNIFY_API_URL) and can be
 * changed later in android/app/src/main/assets/public/config.js.
 */
const website = process.env["GIFTNIFY_API_URL"] ?? "";
const websiteHost = website ? new URL(website).host : "";

const config: CapacitorConfig = {
  appId: "app.giftnify",
  appName: "Giftnify",
  webDir: "dist/client",
  server: {
    androidScheme: "https",
    // Checkout pages open inside the app, then come back to it when payment is done.
    allowNavigation: [
      "checkout.paystack.com",
      "*.paystack.com",
      "*.paystack.co",
      "checkout.flutterwave.com",
      "*.flutterwave.com",
      ...(websiteHost ? [websiteHost] : []),
    ],
  },
  android: {
    // Lets the app talk to a local http:// website while testing. The live website uses https.
    allowMixedContent: true,
  },
};

export default config;
