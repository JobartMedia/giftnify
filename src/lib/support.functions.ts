import { ApiError, api } from "./api";

/** Public contact form for people without an account (e.g. gift recipients). Lands in the website's support inbox. */
export async function submitGuestRequest({ data }: {
  data: { email: string; topic: "Payment" | "Missing gift" | "Redeeming a gift" | "Account access" | "Refund" | "Other"; body: string; giftToken?: string };
}) {
  try {
    await api("/support", { body: { email: data.email, topic: data.topic, body: data.body, ...(data.giftToken ? { gift_token: data.giftToken } : {}) } });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof ApiError ? e.message : "Couldn't send right now. Please try again." };
  }
}
