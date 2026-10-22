import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { AppLayout } from '../Layouts/AppLayout';

const SUPPORT_EMAIL = 'support@giftnify.app';

const SECTIONS = [
  {
    title: 'Sending a gift',
    faqs: [
      { q: 'How does a mystery gift work?', a: 'You record a video, a voice note or write a letter, add cash or a gift, and pay. The recipient gets a sealed link. They see a hint, play your message, and only then find out it was you and what you sent.' },
      { q: 'How do I pay?', a: 'Payments in Naira go through Paystack (card, bank transfer or USSD). Payments in other currencies go through Flutterwave by card. Your card details go to the payment provider, never to Giftnify.' },
      { q: 'How does the recipient get the gift?', a: 'By WhatsApp, SMS or email when you choose those, or by a link you share yourself. You can always copy the link after paying.' },
      { q: 'Will I know when they open it?', a: 'Yes. We email you when they start your message, when they find out it was you, and when they reply.' },
    ],
  },
  {
    title: 'Receiving a gift',
    faqs: [
      { q: 'Can I see who sent it before playing the message?', a: "No. The sender's name and the gift stay hidden until the message has played." },
      { q: 'Why am I asked for a code?', a: 'If the gift was sent to your phone or email, we send a 6-digit code there before any money moves. It stops someone who got hold of the link from taking your gift.' },
      { q: 'How do I receive cash?', a: 'Add it to your Giftnify wallet (instant, needs an account), or choose a bank transfer, airtime, data, electricity or a gift card. Bank payouts only go to an account name confirmed by your bank.' },
      { q: 'How long do withdrawals take?', a: 'We process payout requests every business day. If a payout fails, the money goes back to your wallet automatically.' },
      { q: 'Does a gift expire?', a: 'Yes, 90 days after it was sent. Open it before then.' },
    ],
  },
  {
    title: 'Problems and refunds',
    faqs: [
      { q: 'I was charged but the gift says unpaid.', a: `Payments usually confirm within a few minutes. If it hasn't after an hour, email ${SUPPORT_EMAIL} with your gift link and the payment receipt.` },
      { q: 'Can I cancel a gift and get a refund?', a: `If the gift hasn't been redeemed, email ${SUPPORT_EMAIL} from the email on your account. We'll cancel it and refund the gift amount to the card or account you paid with.` },
      { q: "The recipient never got the message.", a: 'Open your gifts page and copy the gift link to share it yourself. If WhatsApp, SMS or email delivery failed, the gift shows as not delivered there.' },
    ],
  },
];

export default function Help() {
  return (
    <AppLayout>
      <Head title="Help" />
      <div className="mx-auto max-w-3xl space-y-10 pb-12">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink md:text-4xl">Help</h1>
          <p className="mt-1 text-ink-soft">Answers about sending, receiving and getting paid.</p>
        </div>

        {SECTIONS.map((s) => (
          <section key={s.title} aria-labelledby={s.title}>
            <h2 id={s.title} className="font-display text-xl font-extrabold text-ink">{s.title}</h2>
            <div className="mt-3 divide-y divide-line rounded-[1.5rem] border border-line bg-white">
              {s.faqs.map((f) => (
                <details key={f.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 font-bold text-ink">
                    {f.q}
                    <span aria-hidden className="text-xl leading-none text-magenta transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 max-w-[65ch] leading-relaxed text-ink-soft">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <div className="rounded-[1.75rem] bg-gradient-blush p-6 md:p-8">
          <h2 className="font-display text-xl font-extrabold text-ink">Still stuck?</h2>
          <p className="mt-1 text-ink-soft">Email us with your gift link and we'll reply within one business day.</p>
          <p className="mt-4 select-all font-bold text-magenta-deep">{SUPPORT_EMAIL}</p>
          <p className="mt-4 text-sm text-ink-soft">
            See also our <Link href="/terms" className="font-bold text-ink underline">terms</Link> and <Link href="/privacy" className="font-bold text-ink underline">privacy policy</Link>.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
