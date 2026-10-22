import type { CurrencyCode } from "./currency";

export type MessageType = "video" | "audio" | "text";
export type GiftStatus = "Awaiting Payment" | "Preparing" | "Sent" | "Opened" | "Message Viewed" | "Unlocked" | "Redeemed" | "Refunded" | "Cancelled";

export interface Gift {
  token: string;
  direction: "sent" | "received" | "scheduled";
  senderName: string;
  recipientName: string;
  occasion: string;
  messageType: MessageType;
  messageText: string;
  currency: CurrencyCode;
  amount: number;
  item?: string | undefined;
  /** Short-lived playback link for a recorded video/voice message. */
  mediaUrl?: string | undefined;
  delivery: string;
  status: GiftStatus;
  createdAt: string;
}

export const OCCASIONS = [
  { id: "Birthday", icon: "cake" },
  { id: "Anniversary", icon: "ring" },
  { id: "Congratulations", icon: "celebrate" },
  { id: "Thank You", icon: "thanks" },
  { id: "Romantic", icon: "heart" },
  { id: "Just Because", icon: "sparkle" },
  { id: "Wedding", icon: "wedding" },
  { id: "Graduation", icon: "graduation" },
];

export const CONTACTS = [
  { name: "Tunde Akin", handle: "@tundeakin", phone: "+234 803 555 0142", occasion: "Birthday", when: "Today", initials: "TA" },
  { name: "Mimi Ada", handle: "@mimiada", phone: "+234 802 555 0199", occasion: "Birthday", when: "Sunday", initials: "MA" },
  { name: "Chidi Obi", handle: "@chidiobi", phone: "+234 809 555 0110", occasion: "Birthday", when: "Monday", initials: "CO" },
  { name: "Mama Ada", handle: "@mamaada", phone: "+234 805 555 0177", occasion: "Anniversary", when: "Wednesday", initials: "MA" },
];

export const GIFT_ITEMS = [
  { cat: "Flowers", icon: "flowers", name: "Blush Rose Bouquet", price: 25 },
  { cat: "Cakes", icon: "cake", name: "Red Velvet Celebration", price: 30 },
  { cat: "Perfume", icon: "perfume", name: "Signature Eau de Parfum", price: 68 },
  { cat: "Fashion", icon: "bag", name: "Leather Crossbody", price: 85 },
  { cat: "Experiences", icon: "spa", name: "Spa Day for One", price: 75 },
  { cat: "Gift Cards", icon: "giftcard", name: "Shopping Gift Card", price: 50 },
  { cat: "Tech", icon: "headphones", name: "Wireless Earbuds", price: 99 },
  { cat: "Food", icon: "food", name: "Gourmet Dinner Box", price: 40 },
];

const now = () => new Date().toISOString();

export const DEMO_GIFTS: Gift[] = [
  { token: "demo-x7Kp2qLm9Vt4", direction: "received", senderName: "Seun Balogun", recipientName: "You", occasion: "Birthday", messageType: "text",
    messageText: "Happy birthday bro.\nYou deserve the world.\nBuy yourself something great from me.", currency: "NGN", amount: 2000, delivery: "WhatsApp", status: "Sent", createdAt: now() },
  { token: "s-a91Lw3", direction: "sent", senderName: "You", recipientName: "Mimi Ada", occasion: "Thank You", messageType: "video", messageText: "", currency: "NGN", amount: 10000, delivery: "WhatsApp", status: "Unlocked", createdAt: now() },
  { token: "s-b42Kd8", direction: "sent", senderName: "You", recipientName: "Chidi Obi", occasion: "Congratulations", messageType: "audio", messageText: "", currency: "USD", amount: 50, delivery: "Email", status: "Message Viewed", createdAt: now() },
  { token: "s-c77Pq1", direction: "sent", senderName: "You", recipientName: "Mama Ada", occasion: "Anniversary", messageType: "text", messageText: "", currency: "NGN", amount: 0, item: "Blush Rose Bouquet", delivery: "SMS", status: "Redeemed", createdAt: now() },
  { token: "r-d18Zx5", direction: "received", senderName: "Amaka", recipientName: "You", occasion: "Just Because", messageType: "audio", messageText: "", currency: "GBP", amount: 20, delivery: "Link", status: "Redeemed", createdAt: now() },
  { token: "sc-e55Mn2", direction: "scheduled", senderName: "You", recipientName: "Tunde Akin", occasion: "Birthday", messageType: "video", messageText: "", currency: "NGN", amount: 20000, delivery: "WhatsApp", status: "Preparing", createdAt: now() },
];

const KEY = "giftnify.gifts";

/** Gifts this device created. Never includes sample data. */
export function loadGifts(): Gift[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as Gift[]; } catch { return []; }
}

export const isDemoToken = (t: string) => DEMO_GIFTS.some((g) => g.token === t);

export function saveGift(g: Gift) {
  const saved = JSON.parse(localStorage.getItem(KEY) || "[]") as Gift[];
  localStorage.setItem(KEY, JSON.stringify([g, ...saved]));
}

export function findGift(token: string) {
  // Only the labelled sample gifts resolve locally; real gifts always go through the server lookup.
  return DEMO_GIFTS.find((g) => g.token === token);
}

const TOKEN_CHARSET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Cryptographically random, non-sequential gift token with uniform distribution (no modulo bias). */
export function secureToken(length = 12): string {
  const chars: string[] = [];
  // 56 * 4 = 224; discard bytes >= 224 to avoid modulo bias across 0..255
  while (chars.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array((length - chars.length) * 2));
    for (const b of bytes) {
      if (b < 224) {
        chars.push(TOKEN_CHARSET[b % 56]);
        if (chars.length === length) break;
      }
    }
  }
  return chars.join("");
}
