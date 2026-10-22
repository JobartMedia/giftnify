import React, { ReactNode } from 'react';
import { Head } from '@inertiajs/react';
import { AppLayout } from '../Layouts/AppLayout';

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <AppLayout>
      <Head title={title} />
      <article className="mx-auto max-w-[68ch] pb-12 text-[15px] leading-relaxed text-ink-soft [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-ink [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        <h1 className="font-display text-3xl font-extrabold text-ink md:text-4xl">{title}</h1>
        <p className="text-sm">Last updated {updated}</p>
        {children}
      </article>
    </AppLayout>
  );
}
