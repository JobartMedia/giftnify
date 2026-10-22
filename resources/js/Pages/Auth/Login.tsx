import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { AppLayout } from '../../Layouts/AppLayout';
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

export default function Login({ redirect }: { redirect?: string }) {
  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
    remember: true,
    redirect: redirect || '/',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/login');
  };

  return (
    <AppLayout>
      <Head title="Sign In — Giftnify" />

      <div className="max-w-md mx-auto py-10 space-y-6 pb-20">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-[#251522]">Welcome Back</h1>
          <p className="text-sm text-[#7B6674]">
            Sign in to track sent gifts, receive payouts, and manage your contacts.
          </p>
        </div>

        <div className="p-7 sm:p-9 rounded-3xl bg-white border border-[#EADDE5] shadow-soft space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="••••••••"
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#EADDE5] bg-white text-xs text-[#251522] placeholder:text-[#A898A3] focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10 outline-none transition"
                />
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.password}</p>}
              <div className="mt-2 text-right">
                <Link href="/forgot-password" className="text-xs font-bold text-[#B4005E] hover:underline">Forgot password?</Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full py-4 rounded-2xl font-bold bg-gradient-primary text-white shadow-glow hover:opacity-95 active:scale-[0.99] transition flex items-center justify-center gap-2 text-xs"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>Sign In to Account</span>
            </button>
          </form>

          <div className="text-center pt-2 text-xs text-[#7B6674]">
            Don't have an account yet?{' '}
            <Link href="/register" className="font-bold text-[#E5007D] hover:underline">
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
