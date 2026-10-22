import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { AppLayout } from '../../Layouts/AppLayout';
import { Icon3D } from '../../Components/Icon3D';
import { Sparkles, ArrowRight, Loader2, Heart, DollarSign, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function GiftSense() {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Partner / Spouse');
  const [occasion, setOccasion] = useState('Birthday');
  const [budget, setBudget] = useState('50-100');
  const [interests, setInterests] = useState<string[]>(['Travel', 'Wellness']);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter who you are shopping for.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/giftsense/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
        },
        body: JSON.stringify({
          name,
          relationship,
          occasion,
          interests,
          budget,
        }),
      });

      const data = await res.json();
      if (!res.ok || !Array.isArray(data.recommendations)) {
        toast.error(data.message || 'Could not get ideas right now. Try again.');
        return;
      }
      setResults(data);
    } catch {
      toast.error('Could not generate ideas at this moment.');
    } finally {
      setLoading(false);
    }
  };

  const INTEREST_OPTIONS = ['Travel', 'Wellness', 'Music', 'Fashion', 'Gastronomy', 'Tech', 'Art', 'Coffee'];

  return (
    <AppLayout>
      <Head title="Giftgenie A.i — Intelligent Gift Ideas — Giftnify" />

      <div className="max-w-4xl mx-auto space-y-10 pb-20">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF0F7] text-[#E5007D] border border-[#EADDE5] text-xs font-extrabold shadow-soft">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Giftgenie A.i Intelligence</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#251522]">
            Giftgenie A.i Recommendation Engine
          </h1>
          <p className="text-sm text-[#7B6674] max-w-lg mx-auto">
            Tell us about your recipient and let AI curate unforgettable, perfectly matched surprise ideas for any budget.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleGenerate} className="p-7 sm:p-9 rounded-3xl bg-white border border-[#EADDE5] shadow-soft space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7B6674] mb-2">
                Recipient's Name
              </label>
              <input
                type="text"
                placeholder="e.g. Mimi, Chidi, Mom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border border-[#EADDE5] bg-white text-sm text-[#251522] placeholder:text-[#A898A3] focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7B6674] mb-2">
                Relationship
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border border-[#EADDE5] bg-white text-sm text-[#251522] focus:border-[#E5007D] focus:ring-4 focus:ring-[#E5007D]/10 outline-none transition"
              >
                {['Partner / Spouse', 'Friend', 'Parent', 'Sibling', 'Colleague', 'Mentor'].map((r) => (
                  <option key={r} value={r} className="text-[#251522]">{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#7B6674] mb-2">
              Interests & Vibes
            </label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((item) => {
                const active = interests.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setInterests(active ? interests.filter((i) => i !== item) : [...interests, item]);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                      active
                        ? 'border-2 border-[#E5007D] bg-[#FFF0F7] text-[#E5007D] shadow-sm'
                        : 'border-[#EADDE5] bg-white text-[#7B6674] hover:border-[#E5007D]/40 hover:bg-[#FFF0F7]/40'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold bg-gradient-primary text-white shadow-glow hover:opacity-95 active:scale-[0.99] transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span>Generate Personalized Gift Ideas</span>
          </button>
        </form>

        {/* Results */}
        {results && (
          <div className="space-y-6 pt-4">
            <h3 className="text-2xl font-black text-[#251522]">
              {results.examples ? 'Example ideas' : `Ideas for ${name}`}
            </h3>
            {results.examples && (
              <p className="rounded-2xl bg-[#FFF4E0] p-4 text-sm font-semibold text-[#8A5A00]">
                Giftgenie A.i isn't connected yet, so these are general examples rather than ideas picked for {name}.
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {results.recommendations.map((rec: any, idx: number) => (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-white border border-[#EADDE5] shadow-soft space-y-4 flex flex-col justify-between hover:border-[#E5007D]/50 hover:shadow-md transition group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-[#FFF0F7] border border-[#EADDE5] flex items-center justify-center">
                        <Icon3D name={rec.icon || 'gift'} size="xs" />
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FFF0F7] text-[#E5007D] border border-[#EADDE5]">
                        {rec.tag}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-base text-[#251522] group-hover:text-[#E5007D] transition">
                      {rec.name}
                    </h4>
                    <p className="text-xs text-[#7B6674] leading-relaxed">
                      {rec.why}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#EADDE5] flex items-center justify-between">
                    <span className="text-lg font-black text-[#E5007D]">
                      about ${rec.priceUsd}
                    </span>
                    <Link
                      href={`/create?to=${encodeURIComponent(name)}&item=${encodeURIComponent(rec.name)}&price_usd=${rec.priceUsd}`}
                      className="px-4 py-2 rounded-xl bg-gradient-primary text-white text-xs font-bold hover:opacity-95 shadow-glow transition flex items-center gap-1.5"
                    >
                      <span>Send This</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
