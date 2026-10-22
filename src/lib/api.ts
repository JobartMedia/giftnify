/**
 * The app's only connection to data: the Giftnify website's API (/api/v1).
 * Same accounts, gifts, wallets and settings as the website.
 *
 * Point it at the website with VITE_API_URL (default http://localhost:8000).
 */

export const API_URL = String(import.meta.env["VITE_API_URL"] ?? "http://localhost:8000").replace(/\/+$/, "");

const TOKEN_KEY = "giftnify.token";
const TICKET_KEY = "giftnify.gift-tickets";

const isBrowser = () => typeof window !== "undefined";

export function getToken(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null) {
  if (!isBrowser()) return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode: stays signed in for this tab only */
  }
  meCache = null;
  listeners.forEach((l) => l(token ? "SIGNED_IN" : "SIGNED_OUT"));
}

/** Proof (from the website) that the recipient entered the right one-time code for a gift. */
export function getGiftTicket(token: string): string | null {
  if (!isBrowser()) return null;
  try {
    return (JSON.parse(sessionStorage.getItem(TICKET_KEY) || "{}") as Record<string, string>)[token] ?? null;
  } catch {
    return null;
  }
}

export function setGiftTicket(token: string, ticket: string) {
  if (!isBrowser()) return;
  try {
    const all = JSON.parse(sessionStorage.getItem(TICKET_KEY) || "{}") as Record<string, string>;
    all[token] = ticket;
    sessionStorage.setItem(TICKET_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public data: Record<string, unknown>) {
    super(message);
  }
}

type Body = Record<string, unknown> | FormData | undefined;

export async function api<T>(path: string, opts: { method?: string; body?: Body; headers?: Record<string, string> } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", ...(opts.headers ?? {}) };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) body = opts.body;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, { method: opts.method ?? (body ? "POST" : "GET"), headers, body });
  } catch {
    throw new ApiError("Can't reach Giftnify. Check your connection and that the website is running.", 0, {});
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401 && token) setToken(null); // token revoked or expired
  if (!res.ok) {
    const errors = data["errors"] as Record<string, string[]> | undefined;
    const first = errors ? Object.values(errors)[0]?.[0] : undefined;
    throw new ApiError(first ?? String(data["message"] ?? "Something went wrong. Try again."), res.status, data);
  }
  return data as T;
}

/**
 * Like api(), but answers with the body even on 4xx — for endpoints whose
 * error replies carry a result code ({ result: "verify_required" } and so on).
 * Still throws when the website can't be reached or crashes.
 */
export async function apiResult<T>(path: string, opts: Parameters<typeof api>[1] = {}): Promise<T> {
  try {
    return await api<T>(path, opts);
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return e.data as T;
    throw e;
  }
}

/** Sends the recipient's code ticket, if any, so payouts know they proved it's them. */
export const ticketHeader = (token: string): Record<string, string> => {
  const t = getGiftTicket(token);
  return t ? { "X-Gift-Verification": t } : {};
};

/* ---------------- Accounts ---------------- */

export interface Me {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  is_staff: boolean;
  preferred_currency: string | null;
  wallets: { currency: string; balance: number }[];
  gifts_sent: number;
}

type AuthEvent = "SIGNED_IN" | "SIGNED_OUT";
const listeners = new Set<(e: AuthEvent) => void>();
let meCache: Promise<Me | null> | null = null;

export function onAuthChange(cb: (e: AuthEvent) => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** The signed-in person, or null. Cached until sign-in changes. */
export function getMe(force = false): Promise<Me | null> {
  if (!getToken()) return Promise.resolve(null);
  if (!meCache || force) {
    meCache = api<Me>("/me").catch((e) => {
      meCache = null;
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    });
  }
  return meCache;
}

export async function signIn(email: string, password: string) {
  const r = await api<{ token: string; user: Me }>("/auth/login", { body: { email, password } });
  setToken(r.token);
  return r.user;
}

export async function signUp(email: string, password: string, name?: string) {
  const r = await api<{ token: string; user: Me }>("/auth/register", { body: { email, password, ...(name ? { name } : {}) } });
  setToken(r.token);
  return r.user;
}

export async function signOut() {
  try {
    await api("/auth/logout", { method: "POST" });
  } catch {
    /* already signed out */
  }
  setToken(null);
}

export const forgotPassword = (email: string) => api<{ ok: true }>("/auth/forgot-password", { body: { email } });

/** Pages that only exist on the website (staff console, password reset form). */
export const websiteUrl = (path = "/") => `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
