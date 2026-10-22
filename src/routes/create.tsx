import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { deliveryError, normalizeContact, messageVerb } from "@/lib/delivery";
import { z } from "zod";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, MessageCircle, Smartphone, Mail, Link2, Loader2, Lock, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Avatar, Btn, Card, Field } from "@/components/giftnify/ui";
import { MessageComposer, type MessageState } from "@/components/giftnify/MessageComposer";
import { GiftPicker, type GiftChoice } from "@/components/giftnify/GiftPicker";
import { ApiError, api, getToken } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useContacts, initialsOf, deliveryLink } from "@/lib/contacts";
import { feeFor, useContent } from "@/lib/content";
import { Icon3D } from "@/components/giftnify/Icon3D";
import { formatMoney } from "@/lib/currency";
import { startGiftPayment, checkPromo } from "@/lib/payments.functions";
import { cn } from "@/lib/utils";
import { Confetti } from "@/components/giftnify/Confetti";

const search = z.object({
  to: z.string().optional(),
  occasion: z.string().optional(),
  item: z.string().optional(),
  price: z.number().optional(),
  type: z.enum(["money", "item"]).optional(),
});

const DRAFT_KEY = "giftnify.draft";
interface Draft { step: number; name: string; contact: string; occasion: string; msg: MessageState; gift: GiftChoice; channel: string }
function readDraft(): Draft | null {
  try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null") as Draft | null; return d && typeof d.step === "number" ? d : null; } catch { return null; }
}

export const Route = createFileRoute("/create")({
  validateSearch: search,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Create a Mystery Gift — Giftnify" },
      { name: "description", content: "Record a message, attach money or a gift, and let the surprise unfold." },
      { property: "og:title", content: "Create a Mystery Gift — Giftnify" },
      { property: "og:description", content: "Don't just send money. Send a moment." },
    ],
  }),
  component: Create,
});

const STEPS = ["Recipient", "Message", "Gift", "Review"];
const CHANNELS = [
  { id: "WhatsApp", icon: MessageCircle },
  { id: "SMS", icon: Smartphone },
  { id: "Email", icon: Mail },
  { id: "Link", icon: Link2 },
];

function Create() {
  const s = Route.useSearch();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(s.to ?? "");
  const [contact, setContact] = useState("");
  const [occasion, setOccasion] = useState(s.occasion ?? "Birthday");
  const [msg, setMsg] = useState<MessageState>({ type: s.item ? "text" : "video", text: "" });
  const [gift, setGift] = useState<GiftChoice>(s.item ? { mode: "item", currency: "USD", amount: s.price ?? 50, item: s.item } : s.type === "item" ? { mode: "item", currency: "USD", amount: 0 } : { mode: "money", currency: "NGN", amount: 5000 });
  const [channel, setChannel] = useState("WhatsApp");
  const [paying, setPaying] = useState(false);
  const [sentToken, setSentToken] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [restored, setRestored] = useState(false);
  const submitting = useRef(false);
  const navigate = useNavigate();

  // Restore a saved draft (e.g. after signing in) unless the link asked for something specific.
  useEffect(() => {
    const d = readDraft();
    if (d && !s.to && !s.item && !s.type) {
      setStep(Math.min(3, Math.max(0, d.step))); setName(d.name); setContact(d.contact); setOccasion(d.occasion);
      setMsg(d.msg.type === "text" ? d.msg : { ...d.msg, mediaUrl: undefined }); setGift(d.gift); setChannel(d.channel);
      if (d.msg.type !== "text") toast.info("Your draft is back. Please re-record your message — recordings can't be kept before sending.");
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!restored || sentToken) return;
    const draft: Draft = { step, name, contact, occasion, msg: { ...msg, mediaUrl: undefined }, gift, channel };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [restored, sentToken, step, name, contact, occasion, msg, gift, channel]);
  useEffect(() => setTried(false), [step]);

  const content = useContent();
  useEffect(() => {
    if ((msg.type === "video" && !content.features.video_messages) || (msg.type === "audio" && !content.features.voice_messages)) setMsg((m) => ({ ...m, type: "text", mediaUrl: undefined }));
  }, [content.features, msg.type]);
  const { contacts } = useContacts();
  // Only the channels the website can really deliver on (Link always works).
  const channels = CHANNELS.filter((c) => content.deliveryChannels.includes(c.id));
  useEffect(() => {
    if (!content.deliveryChannels.includes(channel)) setChannel(content.deliveryChannels.includes("WhatsApp") ? "WhatsApp" : "Link");
  }, [content.deliveryChannels, channel]);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; percentOff: number } | null>(null);
  async function applyPromo() {
    if (!promoInput.trim()) return;
    try {
      const r = await checkPromo({ data: { code: promoInput } });
      if (r.valid) { setPromo({ code: r.code, percentOff: r.percentOff }); toast.success(`${r.percentOff}% off applied`); }
      else { setPromo(null); toast.error("That code isn't valid"); }
    } catch { toast.error("Sign in to use a promo code"); }
  }
  const fee = feeFor(gift.amount, gift.currency, content.feeRate);
  const discount = promo ? (gift.currency === "NGN" ? Math.round((gift.amount + fee) * promo.percentOff / 100) : Math.round((gift.amount + fee) * promo.percentOff) / 100) : 0;
  const delivErr = deliveryError(channel, contact);
  const errors = [
    name.trim().length < 2 ? "Enter the recipient's name." : null,
    msg.type === "text" ? (msg.text.trim().length < 4 ? "Write a message of at least a few words." : msg.text.length > 2000 ? "Keep your message under 2,000 characters." : null)
      : !msg.mediaUrl ? `Record your ${msg.type} message, or switch to text.` : null,
    gift.mode === "item" && !gift.item ? "Choose a gift." : gift.amount <= 0 ? "Choose an amount." : null,
    delivErr,
  ];
  const stepError = errors[step];
  const canNext = !stepError;

  const { me } = useMe();
  const userId = me === undefined ? undefined : (me?.id ?? null);

  async function mediaBlob(): Promise<Blob | null> {
    if (msg.type === "text" || !msg.mediaUrl) return null;
    return (await fetch(msg.mediaUrl)).blob();
  }

  async function send() {
    if (submitting.current) return;
    if (errors.some(Boolean)) { setTried(true); return; }
    if (!getToken()) { navigate({ to: "/auth", search: { redirect: "/create" } }); return; }
    submitting.current = true;
    setPaying(true);
    const done = () => { setPaying(false); submitting.current = false; };

    // 1. Save the gift on the website (same database as giftnify's website).
    let token: string;
    try {
      const form = new FormData();
      form.append("recipient_name", name.trim());
      form.append("delivery", channel);
      const to = normalizeContact(channel, contact);
      if (to) form.append("recipient_contact", to);
      form.append("occasion", occasion);
      form.append("message_type", msg.type);
      form.append("message_text", msg.text || "A little something to make you smile.");
      form.append("currency", gift.currency);
      form.append("amount", String(gift.amount));
      if (gift.mode === "item" && gift.item) form.append("item", gift.item);
      const blob = await mediaBlob();
      if (blob) {
        const type = blob.type || (msg.type === "video" ? "video/webm" : "audio/webm");
        const ext = type.includes("mp4") ? "mp4" : type.includes("mpeg") ? "mp3" : type.includes("quicktime") ? "mov" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : "webm";
        form.append("media", blob, `message.${ext}`);
      }
      token = (await api<{ token: string }>("/gifts", { body: form })).token;
    } catch (e) {
      done();
      if (e instanceof ApiError && e.status === 401) { navigate({ to: "/auth", search: { redirect: "/create" } }); return; }
      toast.error(e instanceof ApiError ? e.message : "Couldn't save your gift. Check your connection and try again.");
      return;
    }

    // 2. Pay. Paystack/Flutterwave send the sender back to /payment/<reference> in this app.
    let pay: Awaited<ReturnType<typeof startGiftPayment>>;
    try { pay = await startGiftPayment({ data: { token, origin: window.location.origin, ...(promo ? { promo: promo.code } : {}) } }); }
    catch (e) { done(); toast.error(e instanceof Error && e.message ? e.message : "Couldn't start payment. Your gift is saved — try again from Activity."); return; }
    if (pay.status === "redirect") { localStorage.removeItem(DRAFT_KEY); window.location.href = pay.redirectUrl; return; }
    done();
    localStorage.removeItem(DRAFT_KEY);
    setSentToken(token);
  }

  if (sentToken) return <Sent token={sentToken} name={name} gift={gift} channel={channel} contact={contact} />;

  return (
    <AppShell nav={false}>
      <header className="flex items-center gap-3 pt-2">
        {step === 0 ? (
          <Link to="/" className="grid size-10 place-items-center rounded-full border border-border bg-card"><ChevronLeft className="size-5" /></Link>
        ) : (
          <button onClick={() => setStep(step - 1)} className="grid size-10 place-items-center rounded-full border border-border bg-card"><ChevronLeft className="size-5" /></button>
        )}
        <ol className="grid flex-1 grid-cols-4 gap-1.5" aria-label="Gift steps">
          {STEPS.map((l, i) => (
            <li key={l} aria-current={i === step ? "step" : undefined} className="min-w-0">
              <span className={cn("block h-1.5 rounded-full transition", i <= step ? "bg-primary" : "bg-secondary")} />
              <span className={cn("mt-1 block truncate text-[11px] font-bold", i === step ? "text-foreground" : "text-muted-foreground")}>{l}</span>
            </li>
          ))}
        </ol>
      </header>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }} className="mt-6">
          {step === 0 && (
            <>
              <h1 className="text-3xl font-extrabold">Create a Mystery Gift</h1>
              <p className="mt-1 text-muted-foreground">Who are you gifting?</p>
              {userId === null && (
                <Card className="mt-4 bg-blush">
                  <p className="text-sm font-bold">You can start without an account</p>
                  <p className="mt-1 text-sm text-muted-foreground">Prepare your gift now — we keep your draft on this device. You'll sign in before paying, then come straight back to review.</p>
                  <Link to="/auth" search={{ redirect: "/create" }}><Btn className="mt-3 h-10 w-full text-sm">Sign in or create account</Btn></Link>
                </Card>
              )}
              <div className="no-scrollbar -mx-5 mt-5 flex gap-4 overflow-x-auto px-5">
                {contacts.map((c) => (
                  <button key={c.id} onClick={() => { setName(c.name); setContact((channel === "Email" ? c.email ?? c.phone : c.phone ?? c.email) ?? ""); }} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                    <div className={cn("rounded-full p-0.5 transition", name === c.name ? "ring-2 ring-primary" : "")}><Avatar initials={initialsOf(c.name)} /></div>
                    <span className="text-xs font-semibold">{c.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
              <div className="mt-5 space-y-3">
                <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tunde Akin" />
                <Field label="Phone number or email" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+234… or name@email.com" />
              </div>
              <p className="mb-3 mt-6 font-extrabold">Occasion</p>
              <div className="grid grid-cols-3 gap-2 min-[375px]:grid-cols-4">
                {[...content.occasions, { id: "Custom", label: "Custom", icon: "wand" }].map((o) => (
                  <button key={o.id} onClick={() => setOccasion(o.id)}
                    className={cn("flex min-w-0 flex-col items-center gap-1 rounded-2xl border px-1 py-3 transition", occasion === o.id ? "border-primary bg-blush shadow-soft -translate-y-0.5" : "border-border bg-card")}>
                    <Icon3D name={o.icon} size={34} />
                    <span className="min-h-7 max-w-full break-words text-center text-[11px] font-bold leading-tight">{o.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h1 className="text-3xl font-extrabold">Your Message</h1>
              <p className="mb-5 mt-1 text-muted-foreground">{name.split(" ")[0]} will experience this before finding out it's from you.</p>
              <MessageComposer value={msg} onChange={setMsg} recipient={name} occasion={occasion} />
            </>
          )}
          {step === 2 && (
            <>
              <h1 className="text-3xl font-extrabold">Add Something Special</h1>
              <p className="mb-5 mt-1 text-muted-foreground">Hidden until your message has been {messageVerb(msg.type).noun}.</p>
              <GiftPicker value={gift} onChange={setGift} />
            </>
          )}
          {step === 3 && (
            <>
              <h1 className="text-3xl font-extrabold">Review</h1>
              <Card className="mt-5 space-y-4">
                <div className="flex justify-end gap-3 text-xs font-bold text-primary">
                  <button type="button" onClick={() => setStep(0)}>Edit recipient</button>
                  <button type="button" onClick={() => setStep(1)}>Edit message</button>
                  <button type="button" onClick={() => setStep(2)}>Edit gift</button>
                </div>
                <Row label="Recipient"><div className="flex items-center gap-2"><Avatar size="sm" initials={name.split(" ").map((p) => p[0]).join("").slice(0, 2)} /><span className="font-bold">{name}</span></div></Row>
                <Row label="Occasion"><span className="font-bold">{occasion}</span></Row>
                <Row label="Message"><span className="font-bold capitalize">{msg.type} message{msg.duration ? ` · ${String(Math.floor(msg.duration / 60)).padStart(2, "0")}:${String(msg.duration % 60).padStart(2, "0")}` : ""}</span></Row>
                {gift.mode === "item" && <Row label="Gift"><span className="font-bold">{gift.item}</span></Row>}
                <div className="rounded-2xl bg-muted p-3 text-sm">
                  <p className="text-xs font-bold text-muted-foreground">Message preview</p>
                  {msg.type === "text" ? <p className="mt-1 whitespace-pre-wrap break-words">{msg.text}</p>
                    : msg.mediaUrl ? (msg.type === "video" ? <video src={msg.mediaUrl} controls playsInline className="mt-2 max-h-56 w-full rounded-xl" /> : <audio src={msg.mediaUrl} controls className="mt-2 w-full" />)
                    : <p className="mt-1 text-destructive">No recording yet.</p>}
                </div>
              </Card>
              <Card className="mt-4 space-y-3">
                <p className="font-extrabold">Payment summary</p>
                <Row label="Gift amount"><span className="font-semibold">{formatMoney(gift.amount, gift.currency)}</span></Row>
                <Row label="Service fee"><span className="font-semibold">{formatMoney(fee, gift.currency)}</span></Row>
                {discount > 0 && <Row label={`Promo ${promo?.code}`}><span className="font-semibold text-primary">−{formatMoney(discount, gift.currency)}</span></Row>}
                <Row label="Currency"><span className="font-semibold">{gift.currency}</span></Row>
                {content.features.promo_codes && <div className="flex min-w-0 gap-2">
                  <input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder="Promo code" maxLength={40}
                    className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold uppercase outline-none focus:border-primary" />
                  <button type="button" onClick={applyPromo} className="shrink-0 rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-primary-deep">Apply</button>
                </div>}
                <div className="border-t border-dashed pt-3"><Row label="Total charged"><span className="text-xl font-extrabold text-primary">{formatMoney(gift.amount + fee - discount, gift.currency)}</span></Row></div>
              </Card>
              <p className="mb-3 mt-6 font-extrabold">Deliver via</p>
              <div className={cn("grid gap-2", channels.length >= 4 ? "grid-cols-4" : channels.length === 3 ? "grid-cols-3" : channels.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
                {channels.map(({ id, icon: Icon }) => (
                  <button key={id} onClick={() => setChannel(id)} className={cn("flex flex-col items-center gap-1.5 rounded-2xl border py-3 text-xs font-bold", channel === id ? "border-primary bg-blush text-primary" : "border-border bg-card")}>
                    <Icon className="size-5" />{id}
                  </button>
                ))}
              </div>
              {channel !== "Link" ? (
                <div className="mt-3">
                  <Field label={channel === "Email" ? "Recipient's email" : "Recipient's phone (with country code)"} value={contact} onChange={(e) => setContact(e.target.value)}
                    placeholder={channel === "Email" ? "name@example.com" : "+234 803 555 0142"} aria-invalid={!!delivErr} />
                  {delivErr && contact.trim() && <p className="mt-1 text-sm font-semibold text-destructive">{delivErr}</p>}
                </div>
              ) : <p className="mt-3 text-sm text-muted-foreground">You'll get a private link to share however you like.</p>}
              <p className="mt-3 text-sm"><span className="text-muted-foreground">Delivering by </span><span className="font-bold">{channel}</span>{channel !== "Link" && contact.trim() && !delivErr && <><span className="text-muted-foreground"> to </span><span className="font-bold break-all">{normalizeContact(channel, contact)}</span></>}</p>
              <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Lock className="size-3.5" /> Secure checkout. Your gift is only sent after payment is confirmed.</p>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 pb-6">
        {tried && stepError && <p role="alert" className="mb-3 text-sm font-semibold text-destructive">{stepError}</p>}
        {step < 3 ? (
          <Btn className="w-full" onClick={() => (canNext ? setStep(step + 1) : setTried(true))} aria-disabled={!canNext}>Continue</Btn>
        ) : (
          <Btn className="w-full" disabled={paying || !!delivErr} onClick={send}>{paying ? <><Loader2 className="size-5 animate-spin" /> Processing…</> : userId === null ? "Sign in to continue to payment" : "Continue to payment"}</Btn>
        )}
      </div>
    </AppShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-center gap-3 text-sm"><span className="text-muted-foreground">{label}</span><div className="min-w-0 break-words text-right [&>div]:justify-end">{children}</div></div>;
}

function Sent({ token, name, gift, channel, contact }: { token: string; name: string; gift: GiftChoice; channel: string; contact: string }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/gift/${token}` : "";
  const deliver = deliveryLink(channel, contact, `Hi ${name.split(" ")[0]}, someone special sent you a mystery gift on Giftnify 🎁 Open it here: ${url}`);
  return (
    <AppShell nav={false}>
      <div className="flex min-h-[85vh] flex-col items-center justify-center text-center">
        <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 10 }}
          ><Icon3D name="giftOpen" size={140} motion="float" eager /></motion.div>
        <Confetti />
        <h1 className="mt-8 text-3xl font-extrabold">Your gift is on its way</h1>
        <p className="mt-2 text-muted-foreground">{name.split(" ")[0]} will find out it's from you after the message.</p>
        <Card className="mt-6 w-full space-y-3 text-left">
          <Row label="Recipient"><span className="font-bold">{name}</span></Row>
          <Row label="Gift"><span className="font-bold">{gift.mode === "item" ? gift.item : formatMoney(gift.amount, gift.currency)}</span></Row>
          <Row label="Delivery"><span className="font-bold">{channel}</span></Row>
          <Row label="Status"><span className="flex items-center gap-1 font-bold text-success"><Check className="size-4" /> Sent</span></Row>
        </Card>
        <button onClick={() => { navigator.clipboard.writeText(url); toast.success("Gift link copied"); }} className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-left text-sm">
          <span className="flex-1 truncate font-mono text-muted-foreground">{url}</span><Copy className="size-4 text-primary" />
        </button>
        {deliver && contact.trim() ? (
          <a href={deliver} target="_blank" rel="noopener noreferrer" className="mt-6 w-full"><Btn className="w-full">Send via {channel}</Btn></a>
        ) : channel !== "Link" ? (
          <p className="mt-4 text-sm text-muted-foreground">Add {name.split(" ")[0]}'s {channel === "Email" ? "email" : "phone"} next time to send by {channel} in one tap — or copy the link above.</p>
        ) : null}
        <Link to="/gift/$token" params={{ token }} className="mt-3 w-full"><Btn variant="outline" className="w-full">Preview as recipient</Btn></Link>
        <div className="mt-3 grid w-full grid-cols-2 gap-3">
          <Link to="/activity"><Btn variant="outline" className="w-full text-sm">View Gift Status</Btn></Link>
          <a href="/create"><Btn variant="outline" className="w-full text-sm">Send Another</Btn></a>
        </div>
      </div>
    </AppShell>
  );
}
