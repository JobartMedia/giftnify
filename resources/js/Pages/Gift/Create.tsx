import React, { useState, useRef, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { AppLayout } from '../../Layouts/AppLayout';
import { Icon3D } from '../../Components/Icon3D';
import { 
  ChevronLeft, ArrowRight, MessageSquare, Video, Mic, 
  Sparkles, Check, Gift as GiftIcon, DollarSign, Lock, 
  Smartphone, Mail, Link as LinkIcon, AlertCircle, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

export default function Create({ contacts, preselected }: any) {
  const { cms, auth } = usePage().props as any;
  const currencies = cms?.currencies || [];
  const occasions = cms?.occasions || [];

  const [step, setStep] = useState(0);

  // Form states
  const [recipientName, setRecipientName] = useState(preselected?.to || '');
  // Only channels that can really deliver right now (set up on the server)
  const channels: string[] = cms?.delivery_channels?.length ? cms.delivery_channels : ['Link'];
  const [delivery, setDelivery] = useState(channels[0]);
  const [contact, setContact] = useState('');
  const [occasion, setOccasion] = useState(preselected?.occasion || 'Birthday');
  
  // Message state
  const [messageType, setMessageType] = useState<'text' | 'audio' | 'video'>('text');
  const [messageText, setMessageText] = useState('');
  const [aiTone, setAiTone] = useState('warm');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Gift state
  const [giftMode, setGiftMode] = useState<'money' | 'item'>(preselected?.item ? 'item' : 'money');
  const preferred = auth?.user?.preferred_currency;
  const [currency, setCurrency] = useState(
    currencies.some((c: any) => c.code === preferred) ? preferred : (currencies[0]?.code ?? 'NGN')
  );
  const [amount, setAmount] = useState<number>(() => {
    const perUsd = Number(currencies.find((c: any) => c.code === currency)?.per_usd ?? 1);
    if (preselected?.price_usd) return Math.max(1, Math.round(preselected.price_usd * perUsd));
    return currency === 'NGN' ? 10000 : 50;
  });
  const [selectedItem, setSelectedItem] = useState(preselected?.item || '');

  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mystery hint — the one line the recipient reads before the reveal
  const RELATIONSHIPS = ['Family', 'Partner', 'Friend', 'Old friend', 'Colleague', 'Mentor', 'Other'];
  const [relationship, setRelationship] = useState('');
  const [hint, setHint] = useState('');
  const [hintLoading, setHintLoading] = useState(false);

  const fetchHint = async (rel = relationship) => {
    setHintLoading(true);
    try {
      const res = await fetch('/gift-hint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
        },
        body: JSON.stringify({ relationship: rel || 'Other', occasion, recipient_name: recipientName }),
      });
      const data = await res.json();
      if (data.hint) setHint(data.hint);
    } catch {
      toast.error('Could not write a hint right now. You can type your own.');
    } finally {
      setHintLoading(false);
    }
  };

  useEffect(() => {
    if (step === 3 && !hint && !hintLoading) fetchHint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const STEPS = ['Recipient', 'Message', 'Gift', 'Review'];

  // AI draft generator
  const generateAiMessage = async () => {
    setAiGenerating(true);
    try {
      const res = await fetch('/giftsense/write-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
        },
        body: JSON.stringify({
          recipient: recipientName,
          occasion,
          tone: aiTone,
          draft: messageText,
        }),
      });
      const data = await res.json();
      if (data.text) {
        setMessageText(data.text);
        toast.success('AI message crafted!');
      }
    } catch {
      toast.error('Could not generate message at this moment.');
    } finally {
      setAiGenerating(false);
    }
  };

  const currentCurrency = currencies.find((c: any) => c.code === currency) || { symbol: '$', code: 'USD' };
  const feeRate = cms?.fee_rate || 0.02;
  const fee = Math.round(amount * feeRate * 100) / 100;
  const total = amount + fee;

  const validateCurrentStep = () => {
    if (step === 0) {
      if (!recipientName.trim() || recipientName.length < 2) {
        toast.error("Please enter the recipient's name.");
        return false;
      }
      if (delivery !== 'Link' && !contact.trim()) {
        toast.error(`Please provide the recipient's ${delivery === 'Email' ? 'email' : 'phone number'}.`);
        return false;
      }
    }
    if (step === 1) {
      if (messageType === 'text' && messageText.trim().length < 4) {
        toast.error('Please write a short heartfelt message.');
        return false;
      }
    }
    if (step === 2) {
      if (amount <= 0) {
        toast.error('Please enter a valid gift amount.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep((s) => Math.min(s + 1, 3));
    }
  };

  const startMediaRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: messageType === 'video',
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current && messageType === 'video') {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const mime = messageType === 'video' ? 'video/webm' : 'audio/webm';
        const blob = new Blob(chunks, { type: mime });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => {
          if (s >= 59) {
            stopMediaRecording();
            return 60;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      toast.error('Camera / microphone access denied or unavailable.');
    }
  };

  const stopMediaRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const resetRecording = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordSeconds(0);
  };

  const handleCurrencyChange = (newCode: string) => {
    const prevPerUsd = (currentCurrency as any).per_usd || 1.0;
    const targetCur = currencies.find((c: any) => c.code === newCode) || { per_usd: 1.0 };
    const targetPerUsd = targetCur.per_usd || 1.0;
    
    const inUsd = amount / prevPerUsd;
    const newAmount = Math.round(inUsd * targetPerUsd);
    setCurrency(newCode);
    setAmount(newAmount > 0 ? newAmount : 50);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('recipient_name', recipientName);
      formData.append('delivery', delivery);
      if (contact) formData.append('recipient_contact', contact);
      formData.append('occasion', occasion);
      formData.append('message_type', messageType);
      formData.append('message_text', messageText || '');
      formData.append('currency', currency);
      formData.append('amount', String(amount));
      if (relationship) formData.append('relationship', relationship);
      if (hint.trim()) formData.append('sender_hint', hint.trim());
      if (giftMode === 'item' && selectedItem) formData.append('item', selectedItem);
      if (recordedBlob) {
        formData.append('media', recordedBlob, `greeting.webm`);
      }

      const res = await fetch('/create', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        router.visit(`/checkout/${data.token}`);
      } else if (res.status === 419) {
        toast.error('Your session expired. Refresh the page and try again.');
      } else {
        const first = data.errors ? (Object.values(data.errors)[0] as string[])[0] : null;
        toast.error(first || data.message || "The gift couldn't be saved. Check each step and try again.");
      }
    } catch {
      toast.error('Connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <Head title="Create a Mystery Gift — Giftnify" />

      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        
        {/* Step Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            className={`p-2.5 rounded-2xl border border-[#EADDE5] bg-white shadow-soft hover:bg-[#FFF0F7] transition ${
              step === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-100'
            }`}
          >
            <ChevronLeft className="w-5 h-5 text-[#251522]" />
          </button>

          {/* Stepper Progress */}
          <div className="flex items-center gap-2">
            {STEPS.map((sName, idx) => (
              <div key={sName} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    idx <= step
                      ? 'bg-gradient-primary text-white shadow-glow'
                      : 'bg-[#FFF0F7] text-[#7B6674] border border-[#EADDE5]'
                  }`}
                >
                  {idx + 1}
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`w-6 h-1 rounded-full ${
                      idx < step ? 'bg-[#E5007D]' : 'bg-[#EADDE5]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <span className="text-xs font-extrabold uppercase tracking-wider text-[#E5007D]">
            {STEPS[step]}
          </span>
        </div>

        {/* STEP 0: RECIPIENT */}
        {step === 0 && (
          <div className="p-7 sm:p-9 rounded-3xl bg-white border border-[#EADDE5] shadow-soft space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight text-[#251522]">Who is this gift for?</h2>
              <p className="text-sm text-[#7B6674]">Choose your recipient and how they will receive the reveal link.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7B6674] mb-2">
                  Recipient's Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mimi Ada, David, Mom"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-[#EADDE5] bg-white text-sm text-[#251522] placeholder:text-[#A898A3] focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7B6674] mb-2">
                  Occasion
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {occasions.map((occ: any) => (
                    <button
                      key={occ.id}
                      type="button"
                      onClick={() => setOccasion(occ.id)}
                      className={`p-3.5 rounded-2xl border text-center flex flex-col items-center gap-2 transition ${
                        occasion === occ.id
                          ? 'border-2 border-[#E5007D] bg-[#FFF0F7] text-[#251522] font-bold shadow-sm'
                          : 'border-[#EADDE5] bg-white text-[#7B6674] hover:border-[#E5007D]/40 hover:bg-[#FFF0F7]/40'
                      }`}
                    >
                      <Icon3D name={occ.icon || 'gift'} size="xs" />
                      <span className="text-xs">{occ.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7B6674] mb-2">
                  Delivery Channel
                </label>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(channels.length, 4)}, minmax(0, 1fr))` }}>
                  {[
                    { id: 'WhatsApp', icon: Smartphone },
                    { id: 'SMS', icon: Smartphone },
                    { id: 'Email', icon: Mail },
                    { id: 'Link', icon: LinkIcon },
                  ].filter((ch) => channels.includes(ch.id)).map((ch) => {
                    const IconComp = ch.icon;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setDelivery(ch.id)}
                        className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition text-xs font-bold ${
                          delivery === ch.id
                            ? 'border-2 border-[#E5007D] bg-[#FFF0F7] text-[#E5007D]'
                            : 'border-[#EADDE5] bg-white text-[#7B6674] hover:bg-[#FFF0F7]/40'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                        <span>{ch.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {delivery !== 'Link' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7B6674] mb-2">
                    {delivery === 'Email' ? "Recipient's Email" : "Recipient's Phone (with country code)"}
                  </label>
                  <input
                    type={delivery === 'Email' ? 'email' : 'tel'}
                    placeholder={delivery === 'Email' ? 'name@example.com' : '+234 803 555 0142'}
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl border border-[#EADDE5] bg-white text-sm text-[#251522] placeholder:text-[#A898A3] focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10 outline-none transition"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="w-full py-4 rounded-2xl font-bold bg-gradient-primary text-white shadow-glow hover:opacity-95 active:scale-[0.99] transition flex items-center justify-center gap-2"
            >
              <span>Continue to Message</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 1: MESSAGE */}
        {step === 1 && (
          <div className="p-7 sm:p-9 rounded-3xl bg-white border border-[#EADDE5] shadow-soft space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight text-[#251522]">Record your mystery message</h2>
              <p className="text-sm text-[#7B6674]">The recipient must open this to find out who sent the gift and unlock the surprise.</p>
            </div>

            {/* Type tabs */}
            <div className="flex gap-2 p-1.5 rounded-2xl bg-[#FFF0F7] border border-[#EADDE5]">
              {[
                { id: 'text', label: 'Written Note', icon: MessageSquare },
                { id: 'video', label: 'Video Greeting', icon: Video },
                { id: 'audio', label: 'Voice Note', icon: Mic },
              ].map((t) => {
                const IconComp = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMessageType(t.id as any)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                      messageType === t.id
                        ? 'bg-white text-[#251522] shadow-sm'
                        : 'text-[#7B6674] hover:text-[#251522]'
                    }`}
                  >
                    <IconComp className="w-4 h-4 text-[#E5007D]" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {messageType === 'text' && (
              <div className="space-y-3">
                <textarea
                  rows={5}
                  placeholder={`Write your heartfelt ${occasion} message to ${recipientName || 'them'}...`}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-[#EADDE5] bg-white text-sm text-[#251522] placeholder:text-[#A898A3] focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10 outline-none leading-relaxed transition"
                />

                {/* AI Assistant Pill */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FFF0F7] border border-[#EADDE5]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#E5007D]">
                    <Sparkles className="w-4 h-4" />
                    <span>Giftgenie A.i Writer</span>
                  </div>
                  <button
                    type="button"
                    onClick={generateAiMessage}
                    disabled={aiGenerating}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-primary text-white text-xs font-bold shadow-sm hover:opacity-95 transition flex items-center gap-1.5"
                  >
                    {aiGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Polish / Generate</span>
                  </button>
                </div>
              </div>
            )}

            {messageType !== 'text' && (
              <div className="p-6 rounded-2xl border-2 border-dashed border-[#EADDE5] bg-[#FFF0F7]/40 text-center space-y-4">
                {recordedUrl ? (
                  <div className="space-y-3">
                    {messageType === 'video' ? (
                      <div className="rounded-2xl overflow-hidden bg-black border border-[#EADDE5] max-h-60 mx-auto">
                        <video src={recordedUrl} controls playsInline className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-white border border-[#EADDE5]">
                        <audio src={recordedUrl} controls className="w-full" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={resetRecording}
                      className="px-4 py-2 rounded-xl bg-white border border-[#EADDE5] text-[#251522] hover:bg-[#FFF0F7] font-bold text-xs transition shadow-soft"
                    >
                      Delete & Re-record
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messageType === 'video' && (
                      <div className="w-full h-56 rounded-2xl bg-[#251522] border border-[#EADDE5] overflow-hidden relative flex items-center justify-center">
                        <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
                        {!isRecording && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">
                            <Video className="w-8 h-8 text-[#E5007D] mb-1" />
                            <span className="text-xs font-semibold">Camera preview starts on recording</span>
                          </div>
                        )}
                        {isRecording && (
                          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-white" />
                            <span>00:{recordSeconds < 10 ? `0${recordSeconds}` : recordSeconds} / 01:00</span>
                          </div>
                        )}
                      </div>
                    )}

                    {messageType === 'audio' && (
                      <div className="py-6 space-y-2">
                        <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center transition-all ${
                          isRecording ? 'bg-red-500/20 text-red-500 scale-110 shadow-lg' : 'bg-[#FFF0F7] text-[#E5007D]'
                        }`}>
                          <Mic className="w-7 h-7" />
                        </div>
                        {isRecording && (
                          <p className="text-xs font-bold text-red-500 animate-pulse">
                            Recording Audio: 00:{recordSeconds < 10 ? `0${recordSeconds}` : recordSeconds}
                          </p>
                        )}
                      </div>
                    )}

                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startMediaRecording}
                        className="px-6 py-3 rounded-2xl bg-gradient-primary text-white font-bold text-xs shadow-glow hover:opacity-95 transition"
                      >
                        Start {messageType === 'video' ? 'Video' : 'Voice'} Recording (60s Max)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopMediaRecording}
                        className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg transition"
                      >
                        Stop Recording
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="w-full py-4 rounded-2xl font-bold bg-gradient-primary text-white shadow-glow hover:opacity-95 active:scale-[0.99] transition flex items-center justify-center gap-2"
            >
              <span>Continue to Gift Selection</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: GIFT SELECTION */}
        {step === 2 && (
          <div className="p-7 sm:p-9 rounded-3xl bg-white border border-[#EADDE5] shadow-soft space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight text-[#251522]">Attach cash or a luxury surprise</h2>
              <p className="text-sm text-[#7B6674]">Choose the value to be discovered inside the mystery box.</p>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#7B6674]">
                Select Currency
              </span>
              <div className="flex gap-1.5">
                {currencies.map((c: any) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCurrencyChange(c.code)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      currency === c.code
                        ? 'bg-gradient-primary text-white shadow-glow'
                        : 'bg-[#FFF0F7] text-[#7B6674] hover:text-[#251522]'
                    }`}
                  >
                    {c.code}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick chips */}
            <div className="grid grid-cols-4 gap-2">
              {(currency === 'NGN' ? [5000, 10000, 25000, 50000] : [25, 50, 100, 250]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`py-3 rounded-2xl border text-sm font-bold transition ${
                    amount === preset
                      ? 'border-2 border-[#E5007D] bg-[#FFF0F7] text-[#E5007D] shadow-sm font-black'
                      : 'border-[#EADDE5] bg-white text-[#251522] hover:border-[#E5007D]/40'
                  }`}
                >
                  {currentCurrency.symbol}{preset.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Custom Amount Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7B6674] mb-2">
                Custom Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7B6674] font-bold text-lg">
                  {currentCurrency.symbol}
                </span>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-[#EADDE5] bg-white text-lg font-bold text-[#251522] focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10 outline-none transition"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="w-full py-4 rounded-2xl font-bold bg-gradient-primary text-white shadow-glow hover:opacity-95 active:scale-[0.99] transition flex items-center justify-center gap-2"
            >
              <span>Review Mystery Gift</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 3: REVIEW & CONTINUE */}
        {step === 3 && (
          <div className="p-7 sm:p-9 rounded-3xl bg-white border border-[#EADDE5] shadow-soft space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight text-[#251522]">Review your surprise</h2>
              <p className="text-sm text-[#7B6674]">Confirm everything looks perfect before proceeding to checkout.</p>
            </div>

            {/* Live Gift Preview Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FFF0F7] to-[#FCE2EF] border border-[#EADDE5] space-y-4">
              <div className="flex items-center justify-between border-b border-[#EADDE5] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-soft flex items-center justify-center">
                    <Icon3D name="gift-open" size="xs" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#251522]">{occasion} Mystery Gift</h4>
                    <p className="text-xs text-[#7B6674]">For {recipientName} via {delivery}</p>
                  </div>
                </div>
                <span className="text-xl font-black text-[#E5007D]">
                  {currentCurrency.symbol}{amount.toLocaleString()}
                </span>
              </div>

              <div className="text-xs text-[#251522] italic line-clamp-3 bg-white/80 p-3.5 rounded-xl border border-[#EADDE5]">
                "{messageText || 'Heartfelt personal note.'}"
              </div>
            </div>

            {/* Mystery hint */}
            <div className="space-y-3 rounded-2xl border border-[#EADDE5] p-5">
              <div>
                <h3 className="text-base font-extrabold text-[#251522]">The hint they'll see first</h3>
                <p className="text-xs text-[#7B6674]">It should make them curious without giving you away. Pick how they know you and we'll write one, or type your own.</p>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="How do they know you?">
                {RELATIONSHIPS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={relationship === r}
                    onClick={() => { setRelationship(r); fetchHint(r); }}
                    className={`rounded-full border px-3.5 py-2 text-xs font-bold transition ${relationship === r ? 'border-[#251522] bg-[#251522] text-white' : 'border-[#EADDE5] bg-white text-[#251522] hover:border-[#251522]/30'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <label htmlFor="sender-hint" className="sr-only">Hint</label>
              <textarea
                id="sender-hint"
                rows={2}
                maxLength={180}
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder={hintLoading ? 'Writing a hint…' : 'Someone who…'}
                className="w-full resize-none rounded-2xl border border-[#EADDE5] bg-[#FFF8FB] p-3.5 text-sm font-semibold text-[#251522] outline-none focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-[#7B6674]">Don't include your name. If it gives you away, we'll replace it.</p>
                <button type="button" onClick={() => fetchHint()} disabled={hintLoading} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#B4005E] disabled:opacity-50">
                  {hintLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} Write another
                </button>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="space-y-2.5 pt-2 text-sm border-t border-[#EADDE5]">
              <div className="flex justify-between text-[#7B6674]">
                <span>Gift Amount</span>
                <span className="font-semibold text-[#251522]">{currentCurrency.symbol}{amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#7B6674]">
                <span>Platform Delivery & Guarantee (2%)</span>
                <span className="font-semibold text-[#251522]">{currentCurrency.symbol}{fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-[#251522] pt-2 border-t border-[#EADDE5]">
                <span>Total to Pay</span>
                <span className="text-xl font-black text-[#E5007D]">{currentCurrency.symbol}{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl font-bold bg-gradient-primary text-white shadow-glow hover:opacity-95 active:scale-[0.99] transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Securing Gift...</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Continue to Secure Payment</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
