import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Video, Mic, Type, Sparkles, Square, Upload, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Btn, Chip } from "./ui";
import { Icon3D } from "./Icon3D";
import { writeMessage } from "@/lib/ai.functions";
import type { MessageType } from "@/lib/gifts";
import { useContent } from "@/lib/content";
import { cn } from "@/lib/utils";

export interface MessageState { type: MessageType; text: string; mediaUrl?: string | undefined; duration?: number | undefined }

const TONES = ["Heartfelt", "Funny", "Romantic", "Deep", "Professional", "Playful"];
const LANGS = ["English", "Yoruba", "Pidgin", "French", "German", "Spanish"];
const LENGTHS = ["Short", "Medium", "Long"];

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function MessageComposer({ value, onChange, recipient, occasion }: { value: MessageState; onChange: (m: MessageState) => void; recipient: string; occasion: string }) {
  const { features } = useContent();
  const tabs = [
    { id: "video" as const, icon: Video, label: "Video", on: features.video_messages },
    { id: "audio" as const, icon: Mic, label: "Audio", on: features.voice_messages },
    { id: "text" as const, icon: Type, label: "Text", on: true },
  ].filter((t) => t.on);
  return (
    <div>
      <div className="grid gap-1 rounded-2xl bg-muted p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => onChange({ ...value, type: id, mediaUrl: undefined, duration: undefined })}
            className={cn("flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition", value.type === id ? "bg-card text-primary shadow-soft" : "text-muted-foreground")}>
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {value.type === "text" ? (
          <TextMessage value={value} onChange={onChange} recipient={recipient} occasion={occasion} />
        ) : (
          <Recorder key={value.type} kind={value.type} value={value} onChange={onChange} />
        )}
      </div>
    </div>
  );
}

function Recorder({ kind, value, onChange }: { kind: "video" | "audio"; value: MessageState; onChange: (m: MessageState) => void }) {
  const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(0);
  const mr = useRef<MediaRecorder | null>(null);
  const live = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const MAX = 120;

  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => setSecs((s) => { if (s + 1 >= MAX) stop(); return s + 1; }), 1000);
    return () => clearInterval(t);
  }, [rec]);
  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  async function start() {
    try {
      const s = await navigator.mediaDevices.getUserMedia(kind === "video" ? { video: true, audio: true } : { audio: true });
      stream.current = s;
      if (live.current) { live.current.srcObject = s; void live.current.play(); }
      const chunks: Blob[] = [];
      const r = new MediaRecorder(s);
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        const blob = new Blob(chunks, { type: kind === "video" ? "video/webm" : "audio/webm" });
        s.getTracks().forEach((t) => t.stop());
        setSecs((d) => { onChange({ ...value, mediaUrl: URL.createObjectURL(blob), duration: d }); return d; });
      };
      r.start();
      mr.current = r;
      setSecs(0);
      setRec(true);
    } catch {
      toast.error(`Couldn't access your ${kind === "video" ? "camera" : "microphone"}. Try uploading instead.`);
    }
  }
  function stop() { mr.current?.stop(); setRec(false); }

  function upload(f: File) {
    const url = URL.createObjectURL(f);
    const el = document.createElement(kind);
    el.src = url;
    el.onloadedmetadata = () => onChange({ ...value, mediaUrl: url, duration: Math.round(el.duration) || 0 });
  }

  return (
    <div className="space-y-4">
      <div className={cn("relative grid place-items-center overflow-hidden rounded-3xl bg-gradient-plum", kind === "video" ? "aspect-[4/5]" : "h-52")}>
        {kind === "video" && rec && <video ref={live} muted playsInline className="absolute inset-0 size-full object-cover" />}
        {kind === "video" && !rec && value.mediaUrl && <video src={value.mediaUrl} controls playsInline className="absolute inset-0 size-full object-cover" />}
        {kind === "video" && !rec && !value.mediaUrl && (
          <div className="text-center text-plum-foreground/80"><Video className="mx-auto size-10" /><p className="mt-2 text-sm font-semibold">Up to 2 minutes</p></div>
        )}
        {kind === "audio" && (
          <div className="w-full px-6">
            <div className="flex h-20 items-center justify-center gap-1">
              {Array.from({ length: 36 }).map((_, i) => (
                <motion.span key={i} className="w-1.5 rounded-full bg-primary"
                  animate={{ height: rec ? [8, 12 + ((i * 37) % 52), 8] : 6 + ((i * 23) % 30) * (value.mediaUrl ? 1 : 0.3) }}
                  transition={{ duration: 0.6 + (i % 5) * 0.1, repeat: rec ? Infinity : 0 }} />
              ))}
            </div>
            {value.mediaUrl && !rec && <audio src={value.mediaUrl} controls className="mt-3 w-full" />}
          </div>
        )}
        {rec && <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-plum/70 px-3 py-1 text-sm font-bold text-plum-foreground"><Circle className="size-3 fill-primary text-primary" />{fmt(secs)} / 02:00</span>}
        {!rec && value.mediaUrl && kind === "audio" && <span className="absolute left-4 top-4 text-sm font-bold text-plum-foreground">{fmt(value.duration ?? 0)}</span>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {rec ? (
          <Btn onClick={stop} className="col-span-2"><Square className="size-4 fill-current" /> Stop · {fmt(secs)}</Btn>
        ) : (
          <>
            <Btn onClick={start}><Circle className="size-4 fill-current" /> {value.mediaUrl ? "Re-record" : "Record"}</Btn>
            <label className="inline-flex h-13 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-card text-[15px] font-bold hover:bg-blush">
              <Upload className="size-4" /> Upload
              <input type="file" accept={kind === "video" ? "video/*" : "audio/*"} hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
          </>
        )}
      </div>
      <textarea value={value.text} onChange={(e) => onChange({ ...value, text: e.target.value })} rows={2} placeholder="Add a short note (shown after the reveal)…"
        className="w-full resize-none rounded-2xl border border-input bg-card p-4 text-[15px] outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
    </div>
  );
}

function TextMessage({ value, onChange, recipient, occasion }: { value: MessageState; onChange: (m: MessageState) => void; recipient: string; occasion: string }) {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState("Heartfelt");
  const [lang, setLang] = useState("English");
  const [len, setLen] = useState("Short");
  const [busy, setBusy] = useState(false);
  const write = writeMessage;

  async function generate() {
    setBusy(true);
    try {
      const r = await write({ data: { draft: value.text, recipient, occasion, tone, language: lang, length: len } });
      onChange({ ...value, text: r.text });
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't write the message");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <textarea value={value.text} onChange={(e) => onChange({ ...value, text: e.target.value })} rows={7}
        placeholder={`Write something from the heart for ${recipient || "them"}…`}
        className="w-full resize-none rounded-3xl border border-input bg-card p-5 text-[16px] leading-relaxed outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
      <button onClick={() => setOpen(!open)} className="grid w-full grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-2xl bg-blush p-4 text-left">
        <Icon3D name="sparkle" size={40} motion="shimmer" />
        <span className="min-w-0"><span className="block text-[15px] font-bold">Not sure what to say?</span><span className="block text-xs text-muted-foreground">AI Writing Assistant · tone, language, length</span></span>
        <span className="col-start-2 justify-self-start rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Help me write it</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="space-y-4 rounded-3xl border border-border p-4">
              {[["Tone", TONES, tone, setTone], ["Language", LANGS, lang, setLang], ["Length", LENGTHS, len, setLen]].map(([label, opts, cur, set]) => (
                <div key={label as string}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label as string}</p>
                  <div className="flex flex-wrap gap-2">
                    {(opts as string[]).map((o) => <Chip key={o} active={cur === o} onClick={() => (set as (v: string) => void)(o)}>{o}</Chip>)}
                  </div>
                </div>
              ))}
              <Btn onClick={generate} disabled={busy} className="w-full">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {value.text ? "Improve my message" : "Write it for me"}
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
