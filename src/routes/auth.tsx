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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bday, setBday] = useState(0);
  const [bmonth, setBmonth] = useState(0);
  const [visible, setVisible] = useState(true);
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
      if (mode === "in") { await signIn(email, password); go(); return; }
      if (!bday || !bmonth) { setError("Pick your birthday day and month."); return; }
      await signUp(email, password, { name: name.trim() || undefined, phone: phone.trim() || undefined, birth_day: bday, birth_month: bmonth, birthday_visible: visible });
      // New account with nowhere else to go: add the people you love first.
      if (!redirect) { navigate({ to: "/occasions", replace: true }); return; }
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
        {mode === "up" && (
          <>
            <label className="grid gap-1.5 text-sm font-bold">Full name
              <input autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Oluwaseun Adeleke" className={inputCls} />
            </label>
            <label className="grid gap-1.5 text-sm font-bold">Phone number <span className="font-medium text-muted-foreground">(optional)</span>
              <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803 555 0142" className={inputCls} />
              <span className="text-xs font-medium text-muted-foreground">Friends who have your number can find your birthday.</span>
            </label>
            <fieldset className="grid gap-2 rounded-2xl bg-blush p-4">
              <legend className="sr-only">Birthday</legend>
              <p className="font-extrabold">🎂 When's your birthday?</p>
              <p className="text-xs text-muted-foreground">So friends get reminded to gift you. Day and month only. It can't be changed later.</p>
              <div className="grid grid-cols-[1fr_1.6fr] gap-2">
                <select aria-label="Day" required value={bday} onChange={(e) => setBday(Number(e.target.value))} className={inputCls}>
                  <option value={0}>Day</option>
                  {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                </select>
                <select aria-label="Month" required value={bmonth} onChange={(e) => setBmonth(Number(e.target.value))} className={inputCls}>
                  <option value={0}>Month</option>
                  {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <label className="flex items-start gap-2 text-sm font-medium">
                <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
                Let people who have my number or email see my birthday
              </label>
            </fieldset>
          </>
        )}
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
