import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { CURRENCIES, type Currency, type CurrencyCode, SERVICE_FEE_RATE } from "./currency";
import { GIFT_ITEMS, OCCASIONS } from "./gifts";

export interface Occasion { id: string; label: string; icon: string }
export interface CatalogItem { name: string; cat: string; icon: string; price: number }
export interface AppContent {
  occasions: Occasion[];
  items: CatalogItem[];
  currencies: Currency[];
  feeRate: number;
  text: AppText;
  features: Features;
  limits: Limits;
  /** Delivery channels the website can actually send on (always includes Link). */
  deliveryChannels: string[];
}
export interface Features { giftsense: boolean; promo_codes: boolean; video_messages: boolean; voice_messages: boolean }
export interface Limits { max_gift_usd: number; daily_gifts: number }
export const DEFAULT_FEATURES: Features = { giftsense: true, promo_codes: true, video_messages: true, voice_messages: true };
export const DEFAULT_LIMITS: Limits = { max_gift_usd: 1000, daily_gifts: 20 };
export type TextKey = "home_headline" | "home_headline_accent" | "home_subtitle" | "home_cta";
export type AppText = Record<TextKey, string>;

export const DEFAULT_TEXT: AppText = {
  home_headline: "Turn moments into",
  home_headline_accent: "magic.",
  home_subtitle: "Send something meaningful, personal and unforgettable.",
  home_cta: "Create a Mystery Gift",
};

/** Built-in content used before the website responds or if it is unreachable. */
export const FALLBACK_CONTENT: AppContent = {
  occasions: OCCASIONS.map((o) => ({ id: o.id, label: o.id, icon: o.icon })),
  items: GIFT_ITEMS,
  currencies: Object.values(CURRENCIES),
  feeRate: SERVICE_FEE_RATE,
  text: DEFAULT_TEXT,
  features: DEFAULT_FEATURES,
  limits: DEFAULT_LIMITS,
  deliveryChannels: ["Link"],
};

export const contentQueryKey = ["cms", "content"] as const;

interface ContentResponse {
  occasions: Occasion[];
  items: CatalogItem[];
  currencies: { code: string; symbol: string; name: string; decimals: number; per_usd: number }[];
  fee_rate: number;
  features: Partial<Features>;
  text?: Partial<AppText>;
  limits?: Partial<Limits>;
  delivery_channels?: string[];
}

/** The same occasions, catalogue, currencies and switches the website's admin sets. */
async function fetchContent(): Promise<AppContent> {
  try {
    const r = await api<ContentResponse>("/content");
    const currencies = r.currencies
      .filter((c) => c.code in CURRENCIES)
      .map((c) => ({
        code: c.code as CurrencyCode, symbol: c.symbol, name: c.name, decimals: c.decimals,
        presets: CURRENCIES[c.code as CurrencyCode].presets, perUsd: Number(c.per_usd) || CURRENCIES[c.code as CurrencyCode].perUsd,
      }));
    return {
      occasions: r.occasions.length ? r.occasions : FALLBACK_CONTENT.occasions,
      items: r.items.length ? r.items : FALLBACK_CONTENT.items,
      currencies: currencies.length ? currencies : FALLBACK_CONTENT.currencies,
      feeRate: typeof r.fee_rate === "number" ? r.fee_rate : SERVICE_FEE_RATE,
      text: { ...DEFAULT_TEXT, ...(r.text ?? {}) },
      features: { ...DEFAULT_FEATURES, ...r.features },
      limits: { ...DEFAULT_LIMITS, ...(r.limits ?? {}) },
      deliveryChannels: r.delivery_channels?.length ? r.delivery_channels : ["Link"],
    };
  } catch {
    return FALLBACK_CONTENT;
  }
}

export function useContent(): AppContent {
  const { data } = useQuery({ queryKey: contentQueryKey, queryFn: fetchContent, staleTime: 60_000 });
  return data ?? FALLBACK_CONTENT;
}

export function feeFor(amount: number, code: CurrencyCode, rate: number, decimals = CURRENCIES[code].decimals) {
  const fee = amount * rate;
  return decimals === 0 ? Math.round(fee) : Math.round(fee * 100) / 100;
}
