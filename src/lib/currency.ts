export type CurrencyCode = "NGN" | "USD" | "GBP" | "EUR";

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  decimals: number;
  presets: number[];
  /** Demo rate: units of this currency per 1 USD. Confirmed server-side before payment. */
  perUsd: number;
}

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  NGN: { code: "NGN", symbol: "₦", name: "Nigerian Naira", decimals: 0, presets: [1000, 5000, 10000, 20000, 50000], perUsd: 1587 },
  USD: { code: "USD", symbol: "$", name: "US Dollar", decimals: 2, presets: [10, 25, 50, 100, 250], perUsd: 1 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", decimals: 2, presets: [10, 20, 50, 100, 200], perUsd: 0.79 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", decimals: 2, presets: [10, 25, 50, 100, 200], perUsd: 0.92 },
};

export const CURRENCY_LIST = Object.values(CURRENCIES);

export function formatMoney(amount: number, code: CurrencyCode, opts: { compact?: boolean } = {}) {
  const c = CURRENCIES[code];
  const digits = opts.compact || Number.isInteger(amount) ? 0 : c.decimals;
  return c.symbol + amount.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function convert(amount: number, from: CurrencyCode, to: CurrencyCode) {
  return (amount / CURRENCIES[from].perUsd) * CURRENCIES[to].perUsd;
}

export const SERVICE_FEE_RATE = 0.02;
export function serviceFee(amount: number, code: CurrencyCode) {
  const fee = amount * SERVICE_FEE_RATE;
  return CURRENCIES[code].decimals === 0 ? Math.round(fee) : Math.round(fee * 100) / 100;
}
