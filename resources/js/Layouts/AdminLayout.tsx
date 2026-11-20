import { toast } from 'sonner';
import React, { ReactNode, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { 
  Shield, Gift, CreditCard, Tag, Landmark, KeyRound, 
  ArrowLeft, LogOut, LayoutDashboard, Sparkles, Wallet,
  CalendarDays,
} from 'lucide-react';
import { Icon3D } from '../Components/Icon3D';

interface Props {
  children: ReactNode;
  title?: string;
}

export const AdminLayout: React.FC<Props> = ({ children, title }) => {
  const page = usePage();
  const { auth } = page.props as any;
  const url = (page.url || '').split('?')[0];
  const user = auth?.user;
  const flash = (page.props as any).flash ?? {};

  // Server messages (payouts, settings) show as toasts in the staff console too.
  useEffect(() => {
    if (flash.error) toast.error(flash.error);
    if (flash.success) toast.success(flash.success);
    if (flash.info) toast(flash.info);
  }, [flash.error, flash.success, flash.info]);

  const NAV_ITEMS = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Gifts Database', href: '/admin/gifts', icon: Gift },
    { label: 'Payments & Settlement', href: '/admin/payments', icon: CreditCard },
    { label: 'Payout Redemptions', href: '/admin/redemptions', icon: Landmark },
    { label: 'Wallet Withdrawals', href: '/admin/withdrawals', icon: Wallet },
    { label: 'Promo Codes', href: '/admin/promos', icon: Tag },
    { label: 'Payment Settings', href: '/admin/settings/payments', icon: KeyRound },
    { label: 'Google', href: '/admin/settings/google', icon: CalendarDays },
  ];

  return (
    <div className="min-h-screen bg-[#07040d] text-[#f4f2f8] flex flex-col selection:bg-[#ff2d87]">
      {/* Top Staff Banner */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#090514]/80 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group text-xs text-white/50 hover:text-white transition">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Site</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2.5">
              <img src="/images/brand/mark.webp" alt="Giftnify" width={24} height={32} className="h-8 w-auto" />
              <span className="font-extrabold text-sm text-white tracking-tight">Staff Console</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
                {user?.role?.toUpperCase() || 'STAFF'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-white/60 hidden sm:inline">{user?.email}</span>
            <Link
              href="/logout"
              method="post"
              as="button"
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-white/60 hover:text-white transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-2 py-2">
          {NAV_ITEMS.map((item) => {
            const IconComp = item.icon;
            const active = url === item.href || (item.href !== '/admin' && url.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition ${
                  active
                    ? 'bg-gradient-button text-white shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};
