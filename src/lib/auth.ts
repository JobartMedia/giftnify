import { useEffect, useState } from "react";
import { getMe, onAuthChange, type Me } from "./api";

/**
 * The signed-in person for React components.
 * undefined = still checking, null = signed out.
 */
export function useMe(): { me: Me | null | undefined; refresh: () => void } {
  // Starts as "checking" on server and client alike, so the first render matches (no hydration mismatch).
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    getMe(tick > 0).then((m) => live && setMe(m)).catch(() => live && setMe(null));
    const off = onAuthChange(() => setTick((t) => t + 1));
    return () => { live = false; off(); };
  }, [tick]);

  return { me, refresh: () => setTick((t) => t + 1) };
}
