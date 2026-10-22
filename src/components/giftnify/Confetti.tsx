import { motion, useReducedMotion } from "motion/react";

/** Soft graphic confetti: hearts, sparkles and ribbons in brand tones. */
const COLORS = ["var(--primary)", "#FF7AB8", "#FFD1E6", "#B4005E", "#F6C35B"];
const SHAPES = [
  "M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.5 12 21 12 21z",
  "M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z",
  "M4 10h16v4H4z",
  "M12 4a8 8 0 1 0 0 16a8 8 0 0 0 0-16z",
];

export function Confetti({ count = 40 }: { count?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <motion.svg key={i} viewBox="0 0 24 24" width={10 + (i % 4) * 4} height={10 + (i % 4) * 4} className="absolute"
          style={{ left: `${(i * 37) % 100}%`, top: -30, fill: COLORS[i % COLORS.length] }}
          initial={{ y: -40, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", opacity: [1, 1, 0], rotate: (i % 2 ? 1 : -1) * 360 }}
          transition={{ duration: 2.4 + (i % 7) * 0.3, delay: (i % 10) * 0.08, ease: "easeIn" }}>
          <path d={SHAPES[i % SHAPES.length]} />
        </motion.svg>
      ))}
    </div>
  );
}
