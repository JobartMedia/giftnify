import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { AppLayout } from '../../Layouts/AppLayout';
import { Loader2 } from 'lucide-react';

export default function ForgotPassword({ email_ready }: { email_ready: boolean }) {
  const { data, setData, post, processing, errors } = useForm({ email: '' });

  return (
    <AppLayout>
      <Head title="Reset your password" />
      <div className="mx-auto max-w-md py-6">
        <h1 className="font-display text-3xl font-extrabold text-ink">Reset your password</h1>
        <p className="mt-1 text-ink-soft">Enter the email you signed up with and we'll send you a link to choose a new password.</p>

        {!email_ready && (
          <p role="alert" className="mt-5 rounded-2xl bg-[#FFF4E0] p-4 text-sm font-semibold text-[#8A5A00]">
            Password emails aren't switched on yet. Contact support@giftnify.app for help signing in.
          </p>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); post('/forgot-password'); }}
          className="mt-6 grid gap-2 rounded-[1.75rem] border border-line bg-white p-6 shadow-soft"
        >
          <label htmlFor="fp-email" className="text-sm font-bold text-ink">Email</label>
          <input
            id="fp-email"
            type="email"
            required
            autoComplete="email"
            value={data.email}
            onChange={(e) => setData('email', e.target.value)}
            className="h-12 rounded-2xl border border-line bg-white px-4 text-[15px] text-ink outline-none focus:border-magenta focus:ring-4 focus:ring-magenta/10"
          />
          {errors.email && <p className="text-sm font-semibold text-[#A12B2B]">{errors.email}</p>}
          <button type="submit" disabled={processing || !email_ready} className="mt-3 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-primary font-extrabold text-white shadow-glow disabled:opacity-50">
            {processing && <Loader2 className="size-4 animate-spin" aria-hidden />} Send reset link
          </button>
          <Link href="/login" className="mt-2 text-center text-sm font-bold text-ink-soft hover:text-ink">Back to sign in</Link>
        </form>
      </div>
    </AppLayout>
  );
}
