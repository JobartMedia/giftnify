import { motion, useReducedMotion, type TargetAndTransition } from "motion/react";
import { cn } from "@/lib/utils";
import gift from "@/assets/icons/gift.png";
import giftOpen from "@/assets/icons/gift-open.png";
import cake from "@/assets/icons/cake.png";
import ring from "@/assets/icons/ring.png";
import celebrate from "@/assets/icons/celebrate.png";
import heart from "@/assets/icons/heart.png";
import sparkle from "@/assets/icons/sparkle.png";
import thanks from "@/assets/icons/thanks.png";
import wedding from "@/assets/icons/wedding.png";
import graduation from "@/assets/icons/graduation.png";
import lock from "@/assets/icons/lock.png";
import video from "@/assets/icons/video.png";
import mic from "@/assets/icons/mic.png";
import money from "@/assets/icons/money.png";
import text from "@/assets/icons/text.png";
import flowers from "@/assets/icons/flowers.png";
import perfume from "@/assets/icons/perfume.png";
import bag from "@/assets/icons/bag.png";
import spa from "@/assets/icons/spa.png";
import giftcard from "@/assets/icons/giftcard.png";
import headphones from "@/assets/icons/headphones.png";
import food from "@/assets/icons/food.png";
import wand from "@/assets/icons/wand.png";

export const ICONS = {
  gift, giftOpen, cake, ring, celebrate, heart, sparkle, thanks, wedding, graduation, lock, video, mic,
  money, text, flowers, perfume, bag, spa, giftcard, headphones, food, wand,
} as const;
export type IconKey = keyof typeof ICONS;
export const ICON_KEYS = Object.keys(ICONS) as IconKey[];

export type IconMotion = "none" | "float" | "pulse" | "shimmer" | "swing" | "glow";

const loops: Record<Exclude<IconMotion, "none">, TargetAndTransition> = {
  float: { y: [0, -6, 0], rotate: [-2, 2, -2] },
  pulse: { scale: [1, 1.06, 1] },
  shimmer: { rotate: [0, 8, -4, 0], filter: ["brightness(1)", "brightness(1.15)", "brightness(1)"] },
  swing: { rotate: [0, 10, -8, 4, 0] },
  glow: { opacity: [0.9, 1, 0.9], scale: [1, 1.03, 1] },
};

export function Icon3D({ name, size = 40, motion: m = "none", className, eager }: {
  name: IconKey | string; size?: number; motion?: IconMotion; className?: string; eager?: boolean;
}) {
  const reduce = useReducedMotion();
  const src = ICONS[(name in ICONS ? name : "gift") as IconKey];
  const animate = !reduce && m !== "none" ? loops[m] : undefined;
  return (
    <motion.img
      src={src}
      alt=""
      aria-hidden
      width={size}
      height={size}
      loading={eager ? "eager" : "lazy"}
      draggable={false}
      {...(animate ? { animate } : {})}
      {...(reduce ? {} : { whileHover: { scale: 1.08, rotate: -4 } })}
      transition={animate ? { duration: m === "swing" ? 1.2 : 3.2, repeat: Infinity, ease: "easeInOut", repeatDelay: m === "swing" ? 3 : 0 } : { type: "spring", stiffness: 300, damping: 18 }}
      className={cn("block max-w-full shrink-0 select-none object-contain icon-shadow", className)}
      style={{ width: size, height: size }}
    />
  );
}

export const OCCASION_ICON: Record<string, IconKey> = {
  Birthday: "cake", Anniversary: "ring", Congratulations: "celebrate", "Thank You": "thanks", Romantic: "heart",
  "Just Because": "sparkle", Wedding: "wedding", Graduation: "graduation", Custom: "wand",
};
