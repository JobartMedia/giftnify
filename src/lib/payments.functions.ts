import { api } from "./api";

/**
 * Checkout runs on the website's payment system (Paystack / Flutterwave / test
 * mode), so prices, promo codes, limits and receipts are identical in both.
 */

export interface Quote {
  amount: number; fee: number; fee_rate: number; discount: number; total: number;
  currency: string; promo_code: string | null; promo_applied: boolean; message: string | null;
}

/** Starts payment for a gift the signed-in user created. Amount and fee are priced on the server. */
export async function startGiftPayment({ data }: { data: { token: string; origin: string; promo?: string } }) {
  const r = await api<{ status: string; message?: string; redirect_url?: string; reference?: string; token?: string }>(
    `/checkout/${encodeURIComponent(data.token)}/start`,
    { body: { return_to: data.origin, ...(data.promo ? { promo_code: data.promo } : {}) } },
  );
  if (r.status === "redirect" && r.redirect_url) return { status: "redirect" as const, redirectUrl: r.redirect_url };
  if (r.status === "paid" || r.status === "already_paid") return { status: "paid" as const };
  throw new Error(r.message ?? "Couldn't start payment");
}

/** Called when the sender returns from checkout. Verifies with the provider before releasing the gift. */
export async function confirmGiftPayment({ data }: { data: { reference: string } }) {
  const r = await api<{ status: string; token: string; share_link: string }>(`/payments/${encodeURIComponent(data.reference)}`);
  return { status: r.status, giftToken: r.token, shareLink: r.share_link };
}

/** Checks a promo code before checkout so the sender sees their discount. */
export async function checkPromo({ data }: { data: { code: string } }) {
  const r = await api<{ valid: boolean; code?: string; percent_off?: number }>("/promo/check", { body: { code: data.code } });
  return r.valid && r.code ? { valid: true as const, code: r.code, percentOff: r.percent_off ?? 0 } : { valid: false as const };
}

export const quoteGift = (token: string, promo?: string) =>
  api<Quote>(`/checkout/${encodeURIComponent(token)}/quote`, { body: promo ? { promo_code: promo } : {} });
