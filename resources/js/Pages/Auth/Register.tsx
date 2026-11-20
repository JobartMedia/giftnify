import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { AppLayout } from '../../Layouts/AppLayout';
import { ArrowRight, Cake, Loader2, Lock, Mail, Phone, User } from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const field = 'w-full rounded-2xl border border-line bg-white py-3.5 pl-11 pr-4 text-sm text-ink placeholder:text-[#A898A3] outline-none transition focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10';
const select = 'h-[52px] w-full rounded-2xl border border-line bg-white px-3.5 text-sm font-semibold text-ink outline-none transition focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10';

function Label({ htmlFor, children, hint }: { htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-bold text-ink">
      {children}{hint && <span className="text-xs font-semibold text-ink-soft">{hint}</span>}
    </label>
  );
}
const Err = ({ m }: { m?: string }) => (m ? <p className="mt-1.5 text-xs font-semibold text-red-600">{m}</p> : null);

export default function Register({ redirect }: { redirect?: string }) {
  const { data, setData, post, processing, errors } = useForm({
    name: '',
    email: '',
    phone: '',
    birth_day: '',
    birth_month: '',
    birthday_visible: true,
    password: '',
    password_confirmation: '',
    redirect: redirect || '/',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/register');
  };

  return (
    <AppLayout>
      <Head title="Create your account — Giftnify" />
      <div className="mx-auto max-w-lg space-y-6 py-8 pb-20">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Join Giftnify</h1>
          <p className="text-sm text-ink-soft">Send mystery gifts, get reminded before the birthdays of people you love, and get gifted on yours.</p>
        </div>

        <form onSubmit={submit} className="space-y-6 rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8">
          {/* About you */}
          <fieldset className="space-y-4">
            <legend className="mb-1 font-display text-lg font-extrabold text-ink">About you</legend>
            <div>
              <Label htmlFor="name">Full name</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
                <input id="name" required autoComplete="name" placeholder="e.g. Oluwaseun Adeleke" value={data.name} onChange={(e) => setData('name', e.target.value)} className={field} />
              </div>
              <Err m={errors.name} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
                <input id="email" type="email" required autoComplete="email" placeholder="name@example.com" value={data.email} onChange={(e) => setData('email', e.target.value)} className={field} />
              </div>
              <Err m={errors.email} />
            </div>
            <div>
              <Label htmlFor="phone" hint="Optional">Phone number</Label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
                <input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 555 0142" value={data.phone} onChange={(e) => setData('phone', e.target.value)} className={field} />
              </div>
              <p className="mt-1.5 text-xs text-ink-soft">Friends who have your number in their contacts can find your birthday.</p>
              <Err m={errors.phone} />
            </div>
          </fieldset>

          {/* Birthday */}
          <fieldset className="space-y-3 rounded-2xl bg-gradient-to-br from-[#FFF0F7] to-[#FFF8E6] p-4 sm:p-5">
            <legend className="sr-only">Your birthday</legend>
            <p className="flex items-center gap-2 font-display text-lg font-extrabold text-ink"><Cake className="size-5 text-[#E5007D]" aria-hidden /> When's your birthday?</p>
            <p className="text-sm text-ink-soft">So your friends get reminded to gift you, and you can climb the Birthday Leaderboard. We only need the day and month.</p>
            <div className="grid grid-cols-[1fr_1.7fr] gap-2">
              <div>
                <label htmlFor="bday" className="sr-only">Day</label>
                <select id="bday" required value={data.birth_day} onChange={(e) => setData('birth_day', e.target.value)} className={select}>
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="bmonth" className="sr-only">Month</label>
                <select id="bmonth" required value={data.birth_month} onChange={(e) => setData('birth_month', e.target.value)} className={select}>
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
            </div>
            <Err m={errors.birth_day || errors.birth_month} />
            <label className="flex items-start gap-2.5 text-sm text-ink">
              <input type="checkbox" checked={data.birthday_visible} onChange={(e) => setData('birthday_visible', e.target.checked)} className="mt-0.5 size-4 accent-[#E5007D]" />
              <span>Let people who have my number or email see my birthday</span>
            </label>
            <p className="text-xs text-ink-soft">Your birthday can't be changed later, so check it's right.</p>
          </fieldset>

          {/* Password */}
          <fieldset className="space-y-4">
            <legend className="mb-1 font-display text-lg font-extrabold text-ink">Password</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
                  <input id="password" type="password" required minLength={8} autoComplete="new-password" placeholder="8+ characters" value={data.password} onChange={(e) => setData('password', e.target.value)} className={field} />
                </div>
                <Err m={errors.password} />
              </div>
              <div>
                <Label htmlFor="password2">Confirm</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
                  <input id="password2" type="password" required autoComplete="new-password" placeholder="Repeat it" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} className={field} />
                </div>
              </div>
            </div>
          </fieldset>

          <button type="submit" disabled={processing}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gradient-primary font-extrabold text-white shadow-glow transition hover:opacity-95 active:scale-[0.99] disabled:opacity-70">
            {processing ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <ArrowRight className="size-5" aria-hidden />}
            Create my account
          </button>
          <p className="text-center text-xs text-ink-soft">Next, you can add people from your contacts so we can remind you before their birthdays.</p>
        </form>

        <p className="text-center text-sm text-ink-soft">
          Already have an account? <Link href="/login" className="font-bold text-[#E5007D] hover:underline">Sign in</Link>
        </p>
      </div>
    </AppLayout>
  );
}
