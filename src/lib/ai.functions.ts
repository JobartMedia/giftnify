import { api } from "./api";

/** AI helpers run on the website (one API key, one rate limit for both). */

export async function writeMessage({ data }: { data: { draft: string; recipient: string; occasion: string; tone: string; language: string; length: string } }) {
  const r = await api<{ text: string }>("/ai/write-message", { body: data });
  return { text: (r.text ?? "").trim() };
}

export interface GiftDNA {
  interests: string[];
  personality: string[];
  /** True when no AI key is set on the website and these are example ideas. */
  examples: boolean;
  recommendations: { name: string; icon: string; priceUsd: number; match: number; why: string; tag: string }[];
}

export async function giftSense({ data }: {
  data: { name: string; profile: string; relationship: string; age: string; interests: string[]; personality: string; budget: string; occasion: string };
}): Promise<GiftDNA> {
  const r = await api<{ examples: boolean; recommendations: { name: string; icon: string; priceUsd: number; why: string; tag: string }[] }>("/ai/ideas", {
    body: { name: data.name, relationship: data.relationship, occasion: data.occasion, interests: data.interests, budget: data.budget },
  });
  const traits = data.personality.split(/[,;·]+/).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  return {
    interests: data.interests.slice(0, 4),
    personality: traits.length ? traits : [data.relationship || "Thoughtful"],
    examples: r.examples,
    // The list arrives best-first; show that order as a match score.
    recommendations: r.recommendations.map((x, i) => ({ ...x, tag: x.tag || "Idea", match: Math.max(70, 96 - i * 4) })),
  };
}
