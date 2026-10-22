import { api, apiResult, setGiftTicket, ticketHeader } from "./api";
import type { Gift } from "./gifts";

/**
 * Recipient side of a gift, answered by the website's API so a gift opened in
 * the app and on the website is the same gift with the same status.
 */

/** What the recipient's page may know before the reveal: never the sender or the value. */
export interface SealedGift {
  token: string;
  recipientName: string;
  occasion: string;
  messageType: Gift["messageType"];
  messageText: string;
  mediaUrl?: string;
  hint: string | null;
  revealed: boolean;
  hasReply: boolean;
}

export interface RevealedGift {
  senderName: string;
  senderFirst: string;
  currency: string;
  amount: number;
  item: string | null;
  redeemed: boolean;
  signedIn: boolean;
  wallet: { credited: boolean; balance: number; currency: string } | null;
  verify: { required: boolean; channel: "email" | "phone" | null; destination: string | null } | null;
}

type In = { data: { token: string } };

interface SealedResponse {
  error?: "rate_limited" | "expired" | "not_found";
  gift?: {
    token: string; recipient_name: string; occasion: string; message_type: Gift["messageType"];
    message_text: string | null; media_url: string | null; hint: string | null; revealed: boolean; has_reply: boolean;
  };
  banks?: string[];
}

/** Public lookup used by the recipient link. */
export async function getGiftByToken({ data }: In): Promise<(SealedGift & { banks: string[] }) | null | { error: "rate_limited" | "expired" }> {
  const r = await apiResult<SealedResponse>(`/gifts/${encodeURIComponent(data.token)}/sealed`);
  if (r.error === "rate_limited" || r.error === "expired") return { error: r.error };
  const g = r.gift;
  if (!g) return null;
  return {
    token: g.token, recipientName: g.recipient_name, occasion: g.occasion, messageType: g.message_type,
    messageText: g.message_text ?? "", ...(g.media_url ? { mediaUrl: g.media_url } : {}),
    hint: g.hint ?? null, revealed: g.revealed, hasReply: g.has_reply, banks: r.banks ?? [],
  };
}

/** The recipient pressed play. Moves the gift forward to "Opened" (never backwards). */
export async function markGiftOpened({ data }: In) {
  await api(`/gifts/${encodeURIComponent(data.token)}/status`, { body: { status: "Opened" } });
  return { ok: true };
}

/** Called the moment the message ends: who sent it and what it is. Signed in? The cash lands in the wallet now. */
export async function revealGift({ data }: In): Promise<RevealedGift | { error: string }> {
  const r = await apiResult<Record<string, unknown>>(`/gifts/${encodeURIComponent(data.token)}/reveal`, { method: "POST" });
  if (typeof r["error"] === "string") return { error: r["error"] };
  return {
    senderName: String(r["sender_name"] ?? "A friend"),
    senderFirst: String(r["sender_first"] ?? "A friend"),
    currency: String(r["currency"]),
    amount: Number(r["amount"]),
    item: (r["item"] as string | null) ?? null,
    redeemed: Boolean(r["redeemed"]),
    signedIn: Boolean(r["signed_in"]),
    wallet: (r["wallet"] as RevealedGift["wallet"]) ?? null,
    verify: (r["verify"] as RevealedGift["verify"]) ?? null,
  };
}

/** The recipient's first reaction, captured right after the reveal. One reply per gift. */
export async function replyToGift({ data }: { data: { token: string; text?: string; voice?: Blob } }): Promise<{ result: "ok" | "already_replied" | "unavailable" | "error" }> {
  const form = new FormData();
  if (data.text) form.append("text", data.text);
  if (data.voice) form.append("voice", data.voice, (data.voice.type || "").includes("mp4") ? "reply.m4a" : "reply.webm");
  const r = await apiResult<{ ok?: boolean; error?: string }>(`/gifts/${encodeURIComponent(data.token)}/reply`, { body: form });
  if (r.ok) return { result: "ok" };
  return { result: r.error === "already_replied" ? "already_replied" : "error" };
}

/** One-time redemption. Atomic on the server, so a gift can never be redeemed twice. */
export async function redeemGift({ data }: { data: { token: string; method: string; details: Record<string, string> } }) {
  const r = await apiResult<{ result?: string }>("/redeem", { body: data, headers: ticketHeader(data.token) });
  return { result: (r.result ?? "error") as "ok" | "already_redeemed" | "expired" | "refunded" | "invalid" | "rate_limited" | "not_revealed" | "verify_required" | "bank_not_found" | "bank_unavailable" | "error" };
}

/** Sends a one-time code to the phone/email the gift was addressed to. */
export async function sendGiftCode({ data }: In) {
  const r = await apiResult<{ result?: string }>(`/gifts/${encodeURIComponent(data.token)}/code`, { method: "POST" });
  return r.result ?? "unavailable";
}

export async function verifyGiftCode({ data }: { data: { token: string; code: string } }) {
  const r = await apiResult<{ result?: string; ticket?: string | null }>(`/gifts/${encodeURIComponent(data.token)}/code/verify`, { body: { code: data.code } });
  if (r.result === "ok" && r.ticket) setGiftTicket(data.token, r.ticket);
  return r.result ?? "wrong";
}

/** Bank account name check (the bank's name for the account, never what was typed). */
export async function verifyBankAccount(bank: string, account: string): Promise<string | null> {
  const r = await apiResult<{ account_name?: string | null }>("/verify-bank", { body: { bank, account } });
  return r.account_name ?? null;
}

/** Hint preview while creating a gift (same rules as the website). */
export async function previewHint(input: { relationship?: string; occasion?: string; recipient_name?: string }) {
  const r = await api<{ hint: string }>("/ai/hint", { body: input });
  return r.hint;
}
