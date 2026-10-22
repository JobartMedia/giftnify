import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { AppLayout } from '../../Layouts/AppLayout';
import { Lock, Mail, User, ArrowRight, Loader2 } from 'lucide-react';

export default function Register({ redirect }: { redirect?: string }) {
  const { data, setData, post, processing, errors } = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    redirect: redirect || '/',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/register');
  };

  return (
    <AppLayout>
      <Head title="Create Your Account — Giftnify" />

      <div className="max-w-md mx-auto py-10 space-y-6 pb-20">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-[#251522]">Join Giftnify</h1>
          <p className="text-sm text-[#7B6674]">
            Create an account to save contacts, schedule delivery dates, and track your mystery gifts.
          </p>
        </div>

        <div className="p-7 sm:p-9 rounded-3xl bg-white border border-[#EADDE5] shadow-soft space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7B6674] mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#7B6674]" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Adebayo Okon"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#EADDE5] bg-white text-xs text-[#251522] placeholder:text-[#A898A3] focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10 outline-none transition"
                />
              </div>
              {errors.name && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7B6674] mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#7B6674]" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#EADDE5] bg-white text-xs text-[#251522] placeholder:text-[#A898A3] focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10 outline-none transition"
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7B6674] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#7B6674]" />
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#EADDE5] bg-white text-xs text-[#251522] placeholder:text-[#A898A3] focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10 outline-none transition"
                />
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7B6674] mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#7B6674]" />
                <input
                  type="password"
                  required
                  placeholder="Repeat password"
                  value={data.password_confirmation}
                  onChange={(e) => setData('password_confirmation', e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#EADDE5] bg-white text-xs text-[#251522] placeholder:text-[#A898A3] focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full py-4 rounded-2xl font-bold bg-gradient-primary text-white shadow-glow hover:opacity-95 active:scale-[0.99] transition flex items-center justify-center gap-2 text-xs"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>Create Free Account</span>
            </button>
          </form>

          <div className="text-center pt-2 text-xs text-[#7B6674]">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-[#E5007D] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
