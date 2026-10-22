import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import { AppLayout } from '../../Layouts/AppLayout';
import { Loader2 } from 'lucide-react';

export default function ResetPassword({ token, email }: { token: string; email: string }) {
  const { data, setData, post, processing, errors } = useForm({ token, email, password: '', password_confirmation: '' });
  const field = 'h-12 rounded-2xl border border-line bg-white px-4 text-[15px] text-ink outline-none focus:border-magenta focus:ring-4 focus:ring-magenta/10';

  return (
    <AppLayout>
      <Head title="Choose a new password" />
      <div className="mx-auto max-w-md py-6">
        <h1 className="font-display text-3xl font-extrabold text-ink">Choose a new password</h1>
        <form
          onSubmit={(e) => { e.preventDefault(); post('/reset-password'); }}
          className="mt-6 grid gap-2 rounded-[1.75rem] border border-line bg-white p-6 shadow-soft"
        >
          <label htmlFor="rp-email" className="text-sm font-bold text-ink">Email</label>
          <input id="rp-email" type="email" required autoComplete="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className={field} />
          {errors.email && <p className="text-sm font-semibold text-[#A12B2B]">{errors.email}</p>}

          <label htmlFor="rp-pass" className="mt-3 text-sm font-bold text-ink">New password</label>
          <input id="rp-pass" type="password" required autoComplete="new-password" value={data.password} onChange={(e) => setData('password', e.target.value)} className={field} />
          <p className="text-xs text-ink-soft">At least 8 characters.</p>
          {errors.password && <p className="text-sm font-semibold text-[#A12B2B]">{errors.password}</p>}

          <label htmlFor="rp-pass2" className="mt-3 text-sm font-bold text-ink">Repeat new password</label>
          <input id="rp-pass2" type="password" required autoComplete="new-password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} className={field} />

          <button type="submit" disabled={processing} className="mt-4 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-primary font-extrabold text-white shadow-glow disabled:opacity-50">
            {processing && <Loader2 className="size-4 animate-spin" aria-hidden />} Save new password
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
