import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ApiError, forgotPassword, getToken, signIn, signUp } from "@/lib/api";
import { AppShell, Logo } from "@/components/giftnify/ui";

// Only same-site relative paths without open-redirect tricks are allowed as return destinations.
function safePath(p?: string): string {
  if (!p || typeof p !== "string") return "/profile";
  const trimmed = p.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\") || trimmed.includes("://")) {
    return "/profile";
  }
  try {
    const parsed = new URL(trimmed, "https://giftnify.local");
    if (parsed.origin !== "https://giftnify.local") return "/profile";
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return "/profile";
  }
}

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().max(200).optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — Giftnify" },
      { name: "description", content: "Sign in to Giftnify to send, track and save your gifts." },
      { property: "og:title", content: "Sign in — Giftnify" },
      { property: "og:description", content: "Sign in to send and track meaningful gifts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const inputCls = "w-full rounded-2xl border border-border bg-card px-4 py-3.5 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30";

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const dest = safePath(redirect);
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = () => navigate({ to: dest as "/profile", replace: true });

  useEffect(() => {
    if (getToken()) go();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      if (mode === "forgot") {
        await forgotPassword(email);
        toast.success("If that email has an account, a reset link is on its way.");
        setMode("in");
        return;
      }
      // Same account as the website: sign in there or here with the same email and password.
      if (mode === "in") await signIn(email, password);
      else await signUp(email, password);
      go();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell nav={false}>
      <div className="pt-6"><Logo /></div>
      <h1 className="mt-10 text-[32px] font-extrabold leading-tight">{mode === "in" ? "Welcome back." : mode === "up" ? "Create your account." : "Reset your password."}</h1>
      <p className="mt-2 text-muted-foreground">{redirect === "/create" ? "Sign in to continue — your gift draft is saved." : mode === "forgot" ? "We'll email you a link to choose a new password." : "Your gifts, saved and tracked in one place."}</p>
      <form onSubmit={submit} className="mt-8 grid gap-3" noValidate={false}>
        <label className="grid gap-1.5 text-sm font-bold">Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </label>
        {mode !== "forgot" && (
          <label className="grid gap-1.5 text-sm font-bold">Password
            <input type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            {mode === "up" && <span className="text-xs font-medium text-muted-foreground">At least 8 characters.</span>}
          </label>
        )}
        {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
        <button disabled={busy} className="min-h-13 rounded-2xl bg-primary font-bold text-primary-foreground disabled:opacity-50">
          {busy ? "Please wait…" : mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}
        </button>
      </form>
      {mode === "in" && <button type="button" onClick={() => { setMode("forgot"); setError(null); }} className="mt-4 w-full text-center text-sm font-semibold text-muted-foreground">Forgot password?</button>}
      <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(null); }} className="mt-3 w-full text-center text-sm font-bold text-primary">
        {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </AppShell>
  );
}
