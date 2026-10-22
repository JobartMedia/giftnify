import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { AppLayout } from '../../Layouts/AppLayout';
import { Icon3D } from '../../Components/Icon3D';
import { Play } from 'lucide-react';

export default function Demo() {
  return (
    <AppLayout>
      <Head title="Sample unboxing" />
      <div className="mx-auto grid max-w-4xl items-center gap-10 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <div>
          <h1 className="font-display text-3xl font-extrabold leading-tight text-ink md:text-5xl">See what your recipient sees</h1>
          <p className="mt-3 max-w-md text-ink-soft">
            Open a sample birthday gift: the hint, the message, the countdown, then the sender and the cash. No payment, nothing is paid out.
          </p>
          <div className="mt-7 grid gap-3 sm:flex">
            <Link href="/gift/demo-x7Kp2qLm9Vt4" className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-primary px-7 font-extrabold text-white shadow-glow">
              <Play className="size-4 fill-current" aria-hidden /> Open the sample gift
            </Link>
            <Link href="/create" className="inline-flex h-14 items-center justify-center rounded-full border border-line px-6 font-bold text-ink hover:border-ink/25">
              Send a real gift
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-soft">Turn your sound on for the reveal.</p>
        </div>
        <div className="grid place-items-center rounded-[2rem] bg-gradient-plum p-10">
          <Icon3D name="gift" size="xl" className="!size-44" />
        </div>
      </div>
    </AppLayout>
  );
}
