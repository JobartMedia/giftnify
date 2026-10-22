import { describe, expect, it } from "vitest";
import { secureToken } from "@/lib/gifts";
import { deliveryError, normalizeContact } from "@/lib/delivery";

describe("Security and delivery utilities", () => {
  it("generates tokens of exact length using the safe base56 charset", () => {
    const token = secureToken(12);
    expect(token).toHaveLength(12);
    expect(/^[a-km-zA-HJ-NP-Z2-9]{12}$/.test(token)).toBe(true);

    const set = new Set();
    for (let i = 0; i < 50; i++) {
      set.add(secureToken(12));
    }
    expect(set.size).toBe(50);
  });

  it("validates delivery channels correctly", () => {
    expect(deliveryError("Link", "")).toBeNull();
    expect(deliveryError("Email", "test@example.com")).toBeNull();
    expect(deliveryError("Email", "invalid-email")).toBeTruthy();
    expect(deliveryError("WhatsApp", "+2348035550142")).toBeNull();
    expect(deliveryError("WhatsApp", "08035550142")).toBeTruthy();
    expect(deliveryError("SMS", "+14155552671")).toBeNull();
  });

  it("normalizes contacts according to delivery rules", () => {
    expect(normalizeContact("Email", " USER@Example.COM ")).toBe("user@example.com");
    expect(normalizeContact("WhatsApp", " +234 (803) 555-0142 ")).toBe("+2348035550142");
    expect(normalizeContact("Link", "anything")).toBe("anything");
  });
});
