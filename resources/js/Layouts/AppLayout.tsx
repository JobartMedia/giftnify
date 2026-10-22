import React, { ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import { InstallPrompt } from '../Components/InstallPrompt';
import { Link, usePage } from '@inertiajs/react';
import { Sparkles, Gift, CalendarHeart, Plus, Activity, Home, Shield, LogOut, Wallet } from 'lucide-react';

interface Props {
  children: ReactNode;
  title?: string;
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid size-9 place-items-center rounded-[0.9rem] bg-gradient-primary shadow-glow">
        <Gift className="size-[18px] text-white" strokeWidth={2.4} aria-hidden />
      </span>
      <span className={`font-display text-[1.35rem] font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
        Giftnify
      </span>
    </span>
  );
}

const DESKTOP_NAV = [
  { href: '/', label: 'Home' },
  { href: '/giftsense', label: 'Giftgenie A.i' },
  { href: '/occasions', label: 'Occasions' },
  { href: '/demo', label: 'Sample unboxing' },
  { href: '/help', label: 'Help' },
];

function isActive(path: string, href: string) {
  return href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
}

export const AppLayout: React.FC<Props> = ({ children }) => {
  const { auth, url, cms } = usePage().props as any;
  const page = usePage();
  const path = String(page.url || url || '/').split('?')[0];
  const user = auth?.user;
  const flash = (page.props as any).flash ?? {};

  // Server messages (payment errors, confirmations) show as toasts on every page.
  useEffect(() => {
    if (flash.error) toast.error(flash.error);
    if (flash.success) toast.success(flash.success);
    if (flash.info) toast(flash.info);
  }, [flash.error, flash.success, flash.info]);

  const mobileNav = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/giftsense', label: 'Gift Ideas', icon: Sparkles },
    { href: '/create', label: 'Create', icon: Plus, primary: true },
    { href: user ? '/activity' : '/login', label: 'Activity', icon: Activity, match: '/activity' },
    user
      ? { href: '/wallet', label: 'Wallet', icon: Wallet }
      : { href: '/occasions', label: 'Occasions', icon: CalendarHeart },
  ];

  // Signed-in: the wallet chip sits in the header, Help and the sample move to the footer.
  const navItems = user
    ? [...DESKTOP_NAV.slice(0, 3), { href: '/activity', label: 'Activity' }]
    : DESKTOP_NAV;

  const mainBalance = (user?.wallets ?? []).find((w: any) => w.balance > 0);
  const balanceLabel = mainBalance
    ? (() => {
        try {
          return new Intl.NumberFormat(undefined, { style: 'currency', currency: mainBalance.currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(mainBalance.balance);
        } catch {
          return `${mainBalance.currency} ${mainBalance.balance}`;
        }
      })()
    : null;

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-clip bg-white font-sans text-ink">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-line/70 bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/75">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 md:h-[72px] lg:px-8">
          <Link href="/" aria-label="Giftnify home" className="shrink-0 rounded-xl">
            <Wordmark />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const active = isActive(path, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative rounded-full px-3.5 py-2 text-[14px] font-semibold transition-colors ${
                    active ? 'text-ink' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {item.label}
                  {active && <span aria-hidden className="absolute inset-x-3.5 -bottom-[17px] h-[2px] rounded-full bg-magenta" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                {user.is_staff && (
                  <Link
                    href="/admin"
                    className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-bold text-ink-soft transition hover:border-ink/20 hover:text-ink sm:inline-flex"
                  >
                    <Shield className="size-3.5" aria-hidden />
                    Staff
                  </Link>
                )}
                <Link
                  href="/wallet"
                  className="hidden h-10 items-center gap-1.5 rounded-full bg-petal px-3.5 text-sm font-extrabold tabular-nums text-magenta-deep transition hover:bg-petal-deep sm:inline-flex"
                  aria-label={balanceLabel ? `Wallet balance ${balanceLabel}` : 'Wallet'}
                >
                  <Wallet className="size-4" aria-hidden />
                  {balanceLabel ?? 'Wallet'}
                </Link>
                <Link
                  href="/activity"
                  className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 transition hover:border-ink/20"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-petal font-display text-sm font-extrabold text-magenta-deep">
                    {String(user.name || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[7rem] truncate text-sm font-bold">{String(user.name || '').split(' ')[0]}</span>
                </Link>
                <Link
                  href="/logout"
                  method="post"
                  as="button"
                  aria-label="Sign out"
                  className="grid size-10 place-items-center rounded-full text-ink-soft transition hover:bg-petal hover:text-magenta"
                >
                  <LogOut className="size-4" aria-hidden />
                </Link>
              </>
            ) : (
              <Link href="/login" className="rounded-full px-3 py-2 text-sm font-bold text-ink transition hover:text-magenta sm:px-4">
                Sign in
              </Link>
            )}
            <Link
              href="/create"
              className="hidden h-11 items-center gap-2 rounded-full bg-gradient-primary px-5 text-sm font-extrabold text-white shadow-glow transition active:scale-[0.98] md:inline-flex"
            >
              <Gift className="size-4" aria-hidden />
              Send a gift
            </Link>
          </div>
        </div>

        {/* Tablet nav row (md only) */}
        <nav aria-label="Sections" className="no-scrollbar hidden gap-1 overflow-x-auto border-t border-line/60 px-4 py-2 md:flex lg:hidden">
          {navItems.map((item) => {
            const active = isActive(path, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${active ? 'bg-petal text-magenta-deep' : 'text-ink-soft'}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 md:py-10 lg:px-8">{children}</main>

      {/* Footer */}
      <footer className="mt-16 border-t border-line bg-[#FFF8FB] pb-safe-nav text-sm text-ink-soft">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
          <div className="col-span-2 max-w-sm space-y-4 md:col-span-1">
            <Wordmark />
            <p className="leading-relaxed">
              Mystery gifts with a personal video, voice note or letter. Cash or a curated gift, revealed only when the message plays.
            </p>
            {(cms?.currencies ?? []).length > 0 && (
              <p className="text-[13px]">Pay in {(cms.currencies as any[]).map((c) => c.code).join(', ')}.</p>
            )}
          </div>

          <div>
            <h4 className="mb-3 font-sans text-sm font-extrabold text-ink">Gifting</h4>
            <ul className="space-y-1">
              {[
                ['/create', 'Send a mystery gift'],
                ['/giftsense', 'Giftgenie A.i ideas'],
                ['/occasions', 'Occasions & reminders'],
                ['/demo', 'Sample unboxing'],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="inline-block py-1.5 transition hover:text-magenta">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-sans text-sm font-extrabold text-ink">Support</h4>
            <ul className="space-y-1">
              {[
                ['/help', 'Help & FAQs'],
                ['/privacy', 'Privacy policy'],
                ['/terms', 'Terms of service'],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="inline-block py-1.5 transition hover:text-magenta">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-line px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Giftnify. All rights reserved.</p>
          <p>More than a gift. It's a feeling.</p>
        </div>
      </footer>

      <InstallPrompt />

      {/* Mobile bottom navigation — same shell as the app */}
      <nav
        aria-label="App"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-white/90 backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5">
          {mobileNav.map(({ href, label, icon: Icon, primary, match }) => {
            const active = isActive(path, match || href);
            if (primary) {
              return (
                <Link key={label} href={href} className="flex flex-col items-center gap-1 text-[11px] font-bold text-magenta">
                  <span className="-mt-6 grid size-[52px] place-items-center rounded-[1.1rem] bg-gradient-primary shadow-glow ring-4 ring-white transition active:scale-95">
                    <Icon className="size-6 text-white" strokeWidth={2.5} aria-hidden />
                  </span>
                  {label}
                </Link>
              );
            }
            return (
              <Link
                key={label}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors ${
                  active ? 'text-magenta' : 'text-ink-soft'
                }`}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.5 : 2} aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
