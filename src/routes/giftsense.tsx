import { createFileRoute, Link } from "@tanstack/react-router";
import { Icon3D } from "@/components/giftnify/Icon3D";
import { useState } from "react";
import { motion } from "motion/react";
import { Sparkles, Instagram, Check, Bookmark, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Btn, Card, Chip, Field, PageHeader } from "@/components/giftnify/ui";
import { giftSense, type GiftDNA } from "@/lib/ai.functions";

export const Route = createFileRoute("/giftsense")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "GiftSense AI — Find the perfect gift" },
      { name: "description", content: "Tell GiftSense about someone and get gift ideas matched to their interests, personality and budget." },
      { property: "og:title", content: "GiftSense AI — Find the perfect gift" },
      { property: "og:description", content: "Build their Gift DNA and discover gifts they'll actually love." },
    ],
  }),
  component: GiftSense,
});

const INTERESTS = ["Fashion", "Travel", "Music", "Tech", "Fitness", "Books", "Food", "Beauty", "Gaming", "Photography"];
const STEPS = ["Scanning profile signals", "Finding interests & hobbies", "Understanding style", "Identifying preferences", "Curating gift recommendations"];

function GiftSense() {
  const run = giftSense;
  const [phase, setPhase] = useState<"input" | "loading" | "results">("input");
  const [form, setForm] = useState({ name: "", profile: "", relationship: "Friend", age: "25–34", personality: "", budget: "$50–100", occasion: "Birthday" });
  const [interests, setInterests] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [dna, setDna] = useState<GiftDNA | null>(null);
  const [filter, setFilter] = useState("Best Match");
  const [picked, setPicked] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function analyze() {
    setPhase("loading"); setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1100);
    try {
      const r = await run({ data: { ...form, interests } });
      setDna(r); setPhase("results");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "GiftSense is unavailable right now"); setPhase("input");
    } finally { clearInterval(t); }
  }

  const name = form.name.split(" ")[0] || "Their";
  const recs = dna ? (filter === "Best Match" ? dna.recommendations : dna.recommendations.filter((r) => r.tag === filter)) : [];

  return (
    <AppShell>
      <PageHeader title="GiftSense AI" />
      {phase === "input" && (
        <>
          <div className="border-b border-border pb-6">
            <Icon3D name="sparkle" size={48} />
            <h2 className="mt-3 text-2xl font-extrabold leading-tight">Find the Perfect Gift with AI</h2>
            <p className="mt-1 text-sm text-muted-foreground">No more guessing. We'll build their Gift DNA.</p>
          </div>
          <div className="mt-6 space-y-3">
            <Field label="Their name" value={form.name} onChange={set("name")} placeholder="Jessica" />
            <div className="relative">
              <Field label="Social profile (optional)" value={form.profile} onChange={set("profile")} placeholder="instagram.com/jessica" />
              <Instagram className="absolute right-4 top-10 size-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">We only use information you provide or that's authorized — we never scrape private data. Tell us about them instead.</p>
          </div>
          <p className="mb-2 mt-6 font-extrabold">Interests</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => <Chip key={i} active={interests.includes(i)} onClick={() => setInterests(interests.includes(i) ? interests.filter((x) => x !== i) : [...interests, i])}>{i}</Chip>)}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Field label="Relationship" value={form.relationship} onChange={set("relationship")} />
            <Field label="Age range" value={form.age} onChange={set("age")} />
            <Field label="Budget" value={form.budget} onChange={set("budget")} />
            <Field label="Occasion" value={form.occasion} onChange={set("occasion")} />
          </div>
          <div className="mt-3"><Field label="Personality & lifestyle" value={form.personality} onChange={set("personality")} placeholder="Sentimental, always travelling, loves brunch" /></div>
          <Btn onClick={analyze} disabled={!form.name || interests.length === 0} className="mt-6 w-full"><Sparkles className="size-5" /> Build their Gift DNA</Btn>
        </>
      )}

      {phase === "loading" && (
        <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
          <div className="relative grid size-32 place-items-center">
            <motion.span className="absolute inset-0 rounded-full border-4 border-secondary border-t-primary" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }} />
            <Icon3D name="sparkle" size={72} motion="shimmer" eager />
          </div>
          <h2 className="mt-8 text-2xl font-extrabold">Analyzing Interests…</h2>
          <p className="text-muted-foreground">Building their Gift DNA</p>
          <ul className="mt-8 w-full max-w-xs space-y-3 text-left">
            {STEPS.map((s, i) => (
              <li key={s} className={`flex items-center gap-3 text-sm font-semibold transition ${i <= step ? "text-foreground" : "text-muted-foreground/50"}`}>
                <span className={`grid size-6 place-items-center rounded-full ${i < step ? "bg-success text-primary-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {i < step ? <Check className="size-3.5" /> : <span className="size-1.5 rounded-full bg-current" />}
                </span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {phase === "results" && dna && (
        <>
          <Card className="bg-gradient-blush">
            <h2 className="text-2xl font-extrabold">{name}'s Gift DNA</h2>
            <div className="mt-3 flex flex-wrap gap-2">{dna.interests.map((i) => <span key={i} className="rounded-full bg-card px-3 py-1 text-xs font-bold">{i}</span>)}</div>
            <p className="mt-4 text-xs font-bold uppercase text-muted-foreground">Gift personality</p>
            <p className="font-bold text-primary">{dna.personality.join(" · ")}</p>
            {dna.examples && <p className="mt-3 text-xs text-muted-foreground">These are starter ideas. Personalised AI ideas appear once AI is switched on for Giftnify.</p>}
          </Card>
          <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5">
            {["Best Match", ...new Set(dna.recommendations.map((r) => r.tag).filter((t) => t && t !== "Best Match"))].map((f) => <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>)}
          </div>
          <div className="mt-4 space-y-3">
            {recs.map((r) => (
              <Card key={r.name} className={`flex gap-4 p-4 ${picked === r.name ? "border-primary" : ""}`}>
                <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-blush"><Icon3D name={(r as { icon?: string }).icon ?? "gift"} size={52} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold leading-tight">{r.name}</p>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-extrabold text-primary">{Math.round(r.match)}%</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{r.why}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="flex-1 font-extrabold">${Math.round(r.priceUsd)}</span>
                    <button onClick={() => toast.success("Saved")} className="grid size-8 place-items-center rounded-full border border-border"><Bookmark className="size-4" /></button>
                    <button onClick={() => setPicked(r.name)} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">{picked === r.name ? <Check className="size-3.5" /> : <Plus className="size-3.5" />} Add</button>
                  </div>
                </div>
              </Card>
            ))}
            {recs.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No {filter.toLowerCase()} ideas this time.</p>}
          </div>
          <div className="sticky bottom-24 mt-6">
            {(() => { const p = dna.recommendations.find((r) => r.name === picked) ?? dna.recommendations[0]; if (!p) return null; return (
              <Link to="/create" search={{ to: form.name, occasion: form.occasion, item: p.name, price: Math.round(p.priceUsd) }}>
                <Btn className="w-full">Turn this into a Mystery Gift</Btn>
              </Link>); })()}
          </div>
          <button onClick={() => setPhase("input")} className="mt-3 w-full text-sm font-bold text-muted-foreground">Start over</button>
        </>
      )}
    </AppShell>
  );
}
