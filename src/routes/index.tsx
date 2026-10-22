import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, CalendarDays, Play, Video, Send, KeyRound } from "lucide-react";
import { AppShell, Avatar, Btn } from "@/components/giftnify/ui";
import { useContacts } from "@/lib/contacts";
import { useContent } from "@/lib/content";
import { Icon3D } from "@/components/giftnify/Icon3D";
import { MysteryCard } from "@/components/giftnify/MysteryCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Giftnify — More than a gift. It's a feeling." },
      { name: "description", content: "Send mystery gifts with a personal video, voice or text message. The sender and the gift stay hidden until the message plays." },
      { property: "og:title", content: "Giftnify — More than a gift. It's a feeling." },
      { property: "og:description", content: "Mystery reveal gifts and AI gift recommendations. Real gifts. Real emotions." },
    ],
  }),
  component: Home,
});

const SAMPLE_TOKEN = "demo-x7Kp2qLm9Vt4";

const STEPS = [
  { title: "Record your message", body: "Film a short video, record a voice note or write a letter. Gift Ideas can help you find the words." },
  { title: "Add cash or a gift", body: "Choose an amount in your currency, or pick perfume, flowers, a spa day and more from the catalogue." },
  { title: "We deliver the mystery", body: "They get a sealed link by WhatsApp, SMS, email or a link you share. Your name and the gift appear only after your message plays." },
];

function Home() {
  const { occasions, text, features } = useContent();
  const [greeting, setGreeting] = useState("Hello");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);
  const { reminders, uid } = useContacts();
  const today = reminders[0];
  const dateChip = today?.occasion_date
    ? new Date(`${new Date().getFullYear()}-${today.occasion_date.slice(5)}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  const sideTiles = [
    { to: "/create" as const, search: { type: "item" as const }, icon: "gift", title: "Send a gift", body: "Perfume, flowers, spa days and more." },
    ...(features.giftsense ? [{ to: "/giftsense" as const, search: {}, icon: "sparkle", title: "AI gift ideas", body: "Tell us about them, get ideas that fit." }] : []),
  ];

  return (
    <AppShell wide>
      {/* ---------------- Hero ---------------- */}
      <section className="relative grid items-center gap-10 pb-10 pt-2 md:pb-16 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-14 lg:pt-6">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 -z-0 size-[520px] rounded-full bg-[radial-gradient(closest-side,#FFE3F1,transparent)] lg:right-0" />

        <div className="relative min-w-0">
          <p className="text-[15px] font-semibold text-muted-foreground">{greeting}. Who are we surprising today?</p>
          <h1 className="mt-3 font-display text-[2.6rem] font-extrabold leading-[0.98] tracking-[-0.035em] min-[400px]:text-[2.9rem] sm:text-6xl lg:text-[4.6rem]">
            {text.home_headline}
            <br />
            {text.home_headline_accent}
          </h1>
          <p className="mt-5 max-w-[34rem] text-base leading-relaxed text-muted-foreground sm:text-lg">{text.home_subtitle}</p>

          <div className="mt-7 grid gap-3 sm:flex sm:items-center">
            <Link to="/create" className="group inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-gradient-primary px-7 text-base font-extrabold text-primary-foreground shadow-glow transition active:scale-[0.98]">
              {text.home_cta}
              <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link to="/gift/$token" params={{ token: SAMPLE_TOKEN }} className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 text-base font-bold transition hover:border-foreground/25 active:scale-[0.98]">
              <Play className="size-4 fill-primary text-primary" aria-hidden />
              Open a sample gift
            </Link>
          </div>

          <ul className="mt-9 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-border pt-6 text-sm sm:grid-cols-3">
            {[
              { icon: Video, text: "Video, voice or letter" },
              { icon: Send, text: "WhatsApp, SMS, email or link" },
              { icon: KeyRound, text: "Redeemed once, by them" },
            ].map(({ icon: I, text: t }) => (
              <li key={t} className="flex items-center gap-2.5 font-semibold">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blush text-primary-deep"><I className="size-4" aria-hidden /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <MysteryCard sampleToken={SAMPLE_TOKEN} />
      </section>

      {/* ---------------- Start with ---------------- */}
      <section aria-labelledby="start-title" className="py-8 md:py-12">
        <h2 id="start-title" className="font-display text-2xl font-extrabold md:text-3xl">Start with</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:gap-4">
          <Link to="/create" search={{ type: "money" }} className="group relative flex items-center gap-4 overflow-hidden rounded-[1.75rem] border border-border bg-gradient-blush p-4 transition hover:border-primary/30 md:min-h-[300px] md:flex-col md:items-start md:justify-between md:p-8">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-card shadow-soft md:order-2 md:size-auto md:self-end md:bg-transparent md:shadow-none">
              <Icon3D name="money" size={48} className="md:!size-40" />
            </span>
            <span className="min-w-0 flex-1 md:order-1 md:flex-none">
              <span className="block font-display text-lg font-extrabold md:text-3xl">Send money</span>
              <span className="mt-0.5 block text-sm text-muted-foreground md:mt-2 md:max-w-xs md:text-base">A cash surprise they unlock after your message. They choose how to receive it.</span>
            </span>
            <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition group-hover:text-primary md:absolute md:bottom-8 md:left-8 md:size-6" aria-hidden />
          </Link>

          <div className="grid gap-3 md:gap-4">
            {sideTiles.map((t) => (
              <Link key={t.title} to={t.to} search={t.search} className="group flex items-center gap-4 rounded-[1.75rem] border border-border bg-card p-4 transition hover:border-primary/30 md:p-6">
                <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-blush md:size-20"><Icon3D name={t.icon} size={48} className="md:!size-14" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-extrabold md:text-xl">{t.title}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{t.body}</span>
                </span>
                <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition group-hover:text-primary" aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Occasions ---------------- */}
      <section aria-labelledby="occ-title" className="py-8 md:py-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="occ-title" className="font-display text-2xl font-extrabold md:text-3xl">Pick the occasion</h2>
            <p className="mt-1 text-sm text-muted-foreground">Each one comes with its own artwork and message prompts.</p>
          </div>
          <Link to="/create" className="hidden shrink-0 items-center gap-1 text-sm font-bold text-primary-deep hover:underline sm:inline-flex">All occasions <ArrowRight className="size-4" aria-hidden /></Link>
        </div>
        <div className="no-scrollbar -mx-5 mt-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-8">
          {occasions.map((o) => (
            <Link key={o.id} to="/occasions/$occasionId" params={{ occasionId: o.id }} className="group flex w-[88px] shrink-0 snap-start flex-col items-center gap-2 sm:w-auto">
              <span className="grid aspect-square w-full place-items-center rounded-[1.4rem] bg-blush transition duration-300 group-hover:-translate-y-1 group-hover:bg-secondary">
                <Icon3D name={o.icon} size={44} className="sm:!size-14" />
              </span>
              <span className="w-full truncate text-center text-[13px] font-semibold">{o.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------- Upcoming moments (app only — uses saved people) ---------------- */}
      <section aria-labelledby="up-title" className="py-6 md:py-10">
        <div className="flex items-end justify-between gap-4">
          <h2 id="up-title" className="font-display text-2xl font-extrabold md:text-3xl">Upcoming moments</h2>
          <Link to="/occasions" className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-primary-deep hover:underline">See all <ArrowRight className="size-4" aria-hidden /></Link>
        </div>
        <div className="mt-4 rounded-[1.75rem] border border-border bg-gradient-blush p-5 md:p-7">
          {today ? (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <Avatar initials={today.initials} />
                <div className="min-w-0">
                  <p className="truncate font-bold md:text-lg">{today.first}'s {today.occasion.toLowerCase()} is {today.when.toLowerCase()}</p>
                  <p className="truncate text-sm text-muted-foreground">A little surprise could make their day.</p>
                </div>
                {dateChip && <span className="flex shrink-0 items-center gap-1 rounded-xl bg-card px-2.5 py-1.5 text-xs font-bold text-primary-deep"><CalendarDays className="size-3.5" aria-hidden />{dateChip}</span>}
              </div>
              <Link to="/create" search={{ to: today.name, occasion: today.occasion }} className="block">
                <Btn className="h-12 w-full rounded-full px-6 text-sm md:w-auto">Make {today.first}'s day <ArrowRight className="size-4" /></Btn>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <p className="font-bold md:text-lg">Never miss a special day</p>
                <p className="mt-1 text-sm text-muted-foreground">Save birthdays and anniversaries and we'll remind you.</p>
              </div>
              <Link to={uid ? "/occasions" : "/auth"} className="block">
                <Btn className="h-12 w-full rounded-full px-6 text-sm md:w-auto">{uid ? "Add someone" : "Sign in to add people"} <ArrowRight className="size-4" /></Btn>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section aria-labelledby="how-title" className="py-10 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <h2 id="how-title" className="font-display text-3xl font-extrabold leading-tight md:text-4xl">
              Two minutes for you.
              <br className="hidden sm:block" /> A moment they keep.
            </h2>
            <p className="mt-3 max-w-md text-muted-foreground">Three steps from idea to sealed gift. You can save a draft and come back to it.</p>
          </div>
          <ol className="relative space-y-7 border-l-2 border-dashed border-border pl-8 md:space-y-9">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="absolute -left-[3.05rem] top-0 grid size-9 place-items-center rounded-full bg-card font-display text-sm font-extrabold text-primary-deep ring-2 ring-border">{i + 1}</span>
                <h3 className="font-display text-xl font-extrabold">{s.title}</h3>
                <p className="mt-1.5 max-w-[60ch] leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- Closing band ---------------- */}
      <section className="relative my-6 overflow-hidden rounded-[2rem] bg-gradient-plum px-6 py-10 text-white sm:px-10 md:my-10 md:py-14">
        <div className="relative grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:pr-48 lg:pr-56">
          <div>
            <h2 className="font-display text-3xl font-extrabold leading-tight md:text-4xl">Someone's day is about to change.</h2>
            <p className="mt-2 max-w-lg text-white/70">Record the message, seal the gift, and let them find out who it's from.</p>
          </div>
          <Link to="/create" className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-7 font-extrabold text-plum transition hover:bg-blush active:scale-[0.98]">
            {text.home_cta} <ArrowRight className="size-5" aria-hidden />
          </Link>
        </div>
        <div aria-hidden className="pointer-events-none absolute -bottom-8 right-6 hidden md:block lg:right-10">
          <Icon3D name="giftOpen" size={176} className="rotate-12" />
        </div>
      </section>
    </AppShell>
  );
}
