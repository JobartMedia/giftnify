import { createFileRoute } from "@tanstack/react-router";

/**
 * Payment webhooks are received by the website (one payment record for both):
 *   https://<your-website>/api/public/payments/webhook/paystack
 *   https://<your-website>/api/public/payments/webhook/flutterwave
 * This old app address forwards anything it still receives.
 */
const WEBSITE = String(import.meta.env["VITE_API_URL"] ?? "http://localhost:8000").replace(/\/+$/, "");

export const Route = createFileRoute("/api/public/payments/webhook/$provider")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const res = await fetch(`${WEBSITE}/api/public/payments/webhook/${encodeURIComponent(params.provider)}`, {
          method: "POST",
          headers: request.headers,
          body: await request.text(),
        }).catch(() => null);
        return new Response(res ? await res.text() : "unavailable", { status: res?.status ?? 503 });
      },
    },
  },
});
