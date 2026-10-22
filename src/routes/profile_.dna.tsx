import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, Btn, Chip, Field, PageHeader } from "@/components/giftnify/ui";

export const Route = createFileRoute("/profile_/dna")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "My Gift DNA — Giftnify" },
      { name: "description", content: "Share what you love, your sizes and your wishlist so friends always get it right." },
      { property: "og:title", content: "My Gift DNA — Giftnify" },
      { property: "og:description", content: "Your personal gifting preferences." },
    ],
  }),
  component: DNA,
});

const FIELDS = [
  ["likes", "Things I love"], ["colors", "Favorite colors"], ["brands", "Favorite brands"], ["food", "Favorite food"],
  ["music", "Favorite music"], ["experiences", "Favorite experiences"], ["clothing", "Clothing size"], ["shoe", "Shoe size"],
  ["wishlist", "Wishlist"], ["dislikes", "Things I do not want"],
] as const;

function DNA() {
  const [v, setV] = useState<Record<string, string>>({});
  const [vis, setVis] = useState("Friends");
  useEffect(() => { const s = localStorage.getItem("giftnify.dna"); if (s) { const d = JSON.parse(s); setV(d.v ?? {}); setVis(d.vis ?? "Friends"); } }, []);
  return (
    <AppShell>
      <PageHeader title="My Gift DNA" back="/profile" />
      <p className="text-muted-foreground">Help the people who love you get it right, every time.</p>
      <div className="mt-5 space-y-3">
        {FIELDS.map(([k, label]) => <Field key={k} label={label} value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} />)}
      </div>
      <p className="mb-2 mt-6 font-extrabold">Who can see this?</p>
      <div className="flex flex-wrap gap-2">
        {["Private", "Friends", "Anyone with gift link"].map((o) => <Chip key={o} active={vis === o} onClick={() => setVis(o)}>{o}</Chip>)}
      </div>
      <Btn className="mt-8 w-full" onClick={() => { localStorage.setItem("giftnify.dna", JSON.stringify({ v, vis })); toast.success("Gift DNA saved"); }}>Save my Gift DNA</Btn>
    </AppShell>
  );
}
