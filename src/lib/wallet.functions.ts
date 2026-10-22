import { api, apiResult, ticketHeader } from "./api";

/** Wallet — the same balances, history and withdrawals as the website's /wallet page. */

export const WITHDRAWAL_METHODS = ["Bank Transfer", "Airtime Top-up", "Data Bundle", "Electricity", "Gift Card"] as const;
export const MIN_WITHDRAWAL: Record<string, number> = { NGN: 1000, USD: 5, GBP: 5, EUR: 5, CAD: 5 };

export interface WalletData {
  ready: boolean;
  wallets: { currency: string; balance: number }[];
  transactions: { id: string; type: "credit" | "debit"; source: string; amount: number; currency: string | null; description: string | null; created_at: string | null }[];
  withdrawals: { id: string; amount: number; currency: string; method: string; destination: string; status: string; failure_reason: string | null; created_at: string | null }[];
  methods: string[];
  banks: string[];
  minimums: Record<string, number>;
}

/** Adds a revealed cash gift to the signed-in user's wallet. */
export async function claimGiftToWallet({ data }: { data: { token: string } }) {
  const r = await apiResult<{ result?: string; balance?: number | null; currency?: string | null }>(
    `/gifts/${encodeURIComponent(data.token)}/claim`, { method: "POST", headers: ticketHeader(data.token) },
  );
  return { result: r.result ?? "error", balance: r.balance ?? null, currency: r.currency ?? null };
}

export async function getWallet(): Promise<WalletData> {
  const d = await api<Omit<WalletData, "ready">>("/wallet");
  return { ready: true, ...d, methods: d.methods?.length ? d.methods : [...WITHDRAWAL_METHODS], minimums: d.minimums ?? MIN_WITHDRAWAL };
}

export interface WithdrawInput {
  currency: string; amount: number; method: string;
  bank?: string; account?: string; account_name?: string; destination?: string;
}

export async function requestWithdrawal({ data }: { data: WithdrawInput }) {
  const r = await apiResult<{ result?: string; minimum?: number | null; wallets?: WalletData["wallets"] }>("/wallet/withdraw", { body: { ...data } });
  return { result: r.result ?? "error", minimum: r.minimum ?? null, ...(r.wallets ? { wallets: r.wallets } : {}) };
}
