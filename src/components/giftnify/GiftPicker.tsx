import { CURRENCIES, formatMoney, type CurrencyCode } from "@/lib/currency";
import { useContent } from "@/lib/content";
import { Icon3D } from "./Icon3D";
import { cn } from "@/lib/utils";

export interface GiftChoice { mode: "money" | "item"; currency: CurrencyCode; amount: number; item?: string | undefined }

export function CurrencySelector({ value, onChange }: { value: CurrencyCode; onChange: (c: CurrencyCode) => void }) {
  const { currencies } = useContent();
  return (
    <div className="grid grid-cols-4 gap-2">
      {currencies.map((c) => (
        <button key={c.code} onClick={() => onChange(c.code)}
          className={cn("rounded-2xl border py-3 text-center transition", value === c.code ? "border-primary bg-blush text-primary" : "border-border bg-card")}>
          <span className="block text-xl font-extrabold">{c.symbol}</span>
          <span className="text-xs font-bold">{c.code}</span>
        </button>
      ))}
    </div>
  );
}

export function GiftPicker({ value, onChange }: { value: GiftChoice; onChange: (g: GiftChoice) => void }) {
  const { currencies, items } = useContent();
  const byCode = (c: CurrencyCode) => currencies.find((x) => x.code === c) ?? CURRENCIES[c];
  const cur = byCode(value.currency);
  const convert = (a: number, from: CurrencyCode, to: CurrencyCode) => (a / byCode(from).perUsd) * byCode(to).perUsd;
  const isPreset = cur.presets.includes(value.amount);
  const other: CurrencyCode = value.currency === "USD" ? "NGN" : "USD";
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {[{ m: "money" as const, icon: "money", label: "Send Money" }, { m: "item" as const, icon: "gift", label: "Send a Gift" }].map(({ m, icon, label }) => (
          <button key={m} onClick={() => onChange({ ...value, mode: m })}
            className={cn("flex flex-col items-center gap-2 rounded-3xl border p-5 font-bold transition", value.mode === m ? "border-primary bg-blush text-primary shadow-glow" : "border-border bg-card")}>
            <Icon3D name={icon} size={44} /> {label}
          </button>
        ))}
      </div>

      {value.mode === "money" ? (
        <>
          <CurrencySelector value={value.currency} onChange={(c) => onChange({ ...value, currency: c, amount: byCode(c).presets[1] ?? byCode(c).presets[0] ?? 0 })} />
          <div className="rounded-3xl bg-gradient-blush p-6 text-center">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-1 text-4xl font-extrabold min-[375px]:text-5xl">
              <span className="text-primary">{cur.symbol}</span>
              <input inputMode="decimal" value={value.amount || ""} onChange={(e) => onChange({ ...value, amount: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })}
                className="w-full min-w-0 bg-transparent text-center outline-none" aria-label="Amount" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Estimated exchange value: {formatMoney(value.amount, value.currency)} ≈ {formatMoney(Math.round(convert(value.amount, value.currency, other) * 100) / 100, other)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {cur.presets.map((p) => (
              <button key={p} onClick={() => onChange({ ...value, amount: p })}
                className={cn("rounded-2xl border py-3 font-bold transition", value.amount === p ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
                {formatMoney(p, value.currency)}
              </button>
            ))}
            <button onClick={() => onChange({ ...value, amount: 0 })} className={cn("rounded-2xl border py-3 font-bold", !isPreset ? "border-primary text-primary" : "border-border")}>Custom</button>
          </div>
          <p className="text-center text-xs text-muted-foreground">Exchange rate confirmed before payment.</p>
        </>
      ) : (
        <div>
          <p className="mb-3 font-extrabold">Or choose a gift</p>
          <div className="grid grid-cols-2 gap-3">
            {items.map((g) => (
              <button key={g.name} onClick={() => onChange({ ...value, item: g.name, currency: "USD", amount: g.price })}
                className={cn("rounded-2xl border p-4 text-left transition hover:-translate-y-0.5", value.item === g.name ? "border-primary bg-blush shadow-soft" : "border-border bg-card")}>
                <Icon3D name={g.icon} size={48} />
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{g.cat}</p>
                <p className="text-sm font-bold leading-tight">{g.name}</p>
                <p className="mt-1 text-sm font-extrabold text-primary">${g.price}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
