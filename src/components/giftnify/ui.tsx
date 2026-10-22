import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Plus, Gift, Activity, User, ChevronLeft, Sparkles, Bell, Wallet } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid size-9 place-items-center rounded-[0.9rem] bg-gradient-primary shadow-glow">
        <Gift className="size-[18px] text-primary-foreground" strokeWidth={2.4} aria-hidden />
      </div>
      <span className={cn("font-display text-[1.35rem] font-extrabold tracking-tight", light ? "text-plum-foreground" : "text-foreground")}>
        Giftnify
      </span>
    </div>
  );
}

type Variant = "primary" | "outline" | "soft" | "ghost" | "light";
const variants: Record<Variant, string> = {
  primary: "bg-gradient-primary text-primary-foreground shadow-glow hover:brightness-110",
  outline: "border border-border bg-card text-foreground hover:border-foreground/25",
  soft: "bg-secondary text-secondary-foreground hover:brightness-95",
  ghost: "text-muted-foreground hover:bg-muted",
  light: "bg-plum-foreground text-plum hover:brightness-95",
};

export function Btn({ variant = "primary", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...p}
      className={cn(
        "inline-flex min-h-13 min-w-0 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-center text-[15px] font-bold leading-snug transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&>svg]:shrink-0",
        variants[variant],
        className,
      )}
    />
  );
}

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition",
        active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:border-foreground/25",
      )}
    >
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-3xl border border-border bg-card p-5 shadow-soft", className)}>{children}</div>;
}

export function Avatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  const s = { sm: "size-9 text-xs", md: "size-11 text-sm", lg: "size-24 text-2xl" }[size];
  return <div className={cn("grid shrink-0 place-items-center rounded-full bg-secondary font-extrabold text-primary-deep", s)}>{initials}</div>;
}

export function PageHeader({ title, back, right }: { title: string; back?: string; right?: ReactNode }) {
  return (
    <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 pb-4 pt-2">
      {back && (
        <Link to={back} aria-label="Go back" className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card transition hover:border-foreground/25">
          <ChevronLeft className="size-5" />
        </Link>
      )}
      <h1 className={cn("min-w-0 font-display text-[1.4rem] font-extrabold md:text-3xl", !back && "col-span-2")}>{title}</h1>
      {right}
    </header>
  );
}

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/giftsense", label: "Gift Ideas", icon: Sparkles },
  { to: "/create", label: "Create", icon: Plus },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/profile", label: "Profile", icon: User },
] as const;

const TOP_NAV = [
  { to: "/", label: "Home" },
  { to: "/giftsense", label: "Gift Ideas" },
  { to: "/occasions", label: "Occasions" },
  { to: "/activity", label: "Activity" },
  { to: "/wallet", label: "Wallet" },
] as const;

const isActive = (path: string, to: string) => (to === "/" ? path === "/" : path === to || path.startsWith(to + "/"));

/**
 * App frame — mirrors the website's AppLayout: sticky header (desktop nav on md+),
 * mobile bottom nav with the raised Create button. `wide` lets marketing-style
 * screens (home) use the full desktop width.
 */
export function AppShell({ children, nav = true, wide = false }: { children: ReactNode; nav?: boolean; wide?: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="relative min-h-[100dvh] overflow-x-clip bg-background">
      {nav && (
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 md:h-[72px] md:px-8">
            <Link to="/" aria-label="Giftnify home" className="shrink-0 rounded-xl"><Logo /></Link>
            <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
              {TOP_NAV.map(({ to, label }) => {
                const active = isActive(path, to);
                return (
                  <Link key={to} to={to} aria-current={active ? "page" : undefined} className={cn("relative rounded-full px-3.5 py-2 text-[14px] font-semibold transition-colors", active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                    {label}
                    {active && <span aria-hidden className="absolute inset-x-3.5 -bottom-[17px] h-[2px] rounded-full bg-primary" />}
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center gap-2">
              <Link to="/occasions" aria-label="Occasion reminders" className="grid size-11 place-items-center rounded-full border border-border bg-card transition hover:border-foreground/25 md:hidden">
                <Bell className="size-[18px]" aria-hidden />
              </Link>
              <Link to="/create" className="hidden h-11 items-center gap-2 rounded-full bg-gradient-primary px-5 text-sm font-extrabold text-primary-foreground shadow-glow transition active:scale-[0.98] md:inline-flex">
                <Gift className="size-4" aria-hidden /> Send a gift
              </Link>
            </div>
          </div>
        </header>
      )}
      <main className={cn("relative mx-auto w-full px-5 pt-4 md:px-8 md:pt-8", wide ? "max-w-7xl" : "max-w-md md:max-w-2xl", nav ? "pb-[calc(112px+env(safe-area-inset-bottom))] md:pb-16" : "pb-10")}>{children}</main>
      {nav && (
        <nav aria-label="App" className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/90 backdrop-blur-xl md:hidden">
          <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = isActive(path, to);
              if (to === "/create") {
                return (
                  <Link key={to} to={to} className="flex flex-col items-center gap-1 text-[11px] font-bold text-primary">
                    <span className="-mt-6 grid size-[52px] place-items-center rounded-[1.1rem] bg-gradient-primary shadow-glow ring-4 ring-card transition active:scale-95">
                      <Icon className="size-6 text-primary-foreground" strokeWidth={2.5} aria-hidden />
                    </span>
                    {label}
                  </Link>
                );
              }
              return (
                <Link key={to} to={to} aria-current={active ? "page" : undefined} className={cn("flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors", active ? "text-primary" : "text-muted-foreground")}>
                  <Icon className="size-[22px]" strokeWidth={active ? 2.5 : 2} aria-hidden />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export function Field({ label, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-foreground">{label}</span>
      <input {...p} className="h-12 w-full rounded-2xl border border-input bg-card px-4 text-[15px] outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/12" />
    </label>
  );
}
