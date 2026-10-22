import React from 'react';

/**
 * "Moments" — illustrated scenes for the kinds of gifts people send.
 * Each card is a small composition of the 3D artwork on its own colour field,
 * with an example message. Scrolls sideways on phones, three across on desktop.
 *
 * Shared by website and app; keep both copies identical:
 *   resources/js/Components/stage/MomentsGallery.tsx
 *   src/components/giftnify/stage/MomentsGallery.tsx
 */

type IconName = 'cake' | 'money' | 'ring' | 'heart' | 'graduation' | 'celebrate' | 'flowers' | 'perfume' | 'thanks' | 'sparkle' | 'spa' | 'gift';

interface Moment {
  occasion: string;
  title: string;
  quote: string;
  gift: string;
  art: [IconName, IconName, IconName];
  field: string;
  ink: string;
}

const MOMENTS: Moment[] = [
  {
    occasion: 'Birthday',
    title: 'A birthday from across the ocean',
    quote: 'I can’t be there for cake, so this is me singing badly from London.',
    gift: '₦40,000 cash',
    art: ['cake', 'money', 'sparkle'],
    field: 'linear-gradient(150deg,#FFD9EC 0%,#FF9CCB 55%,#F25BA5 100%)',
    ink: '#4A0A2C',
  },
  {
    occasion: 'Graduation',
    title: 'For the first graduate in the family',
    quote: 'Mum would have been so proud. I am too.',
    gift: '£50 cash',
    art: ['graduation', 'celebrate', 'money'],
    field: 'linear-gradient(150deg,#E4E9FF 0%,#AFC0FF 55%,#6F86F2 100%)',
    ink: '#14205A',
  },
  {
    occasion: 'Anniversary',
    title: 'Ten years, one voice note',
    quote: 'Same question as the first night we met: dinner, my treat?',
    gift: 'Dinner for two',
    art: ['ring', 'heart', 'flowers'],
    field: 'linear-gradient(150deg,#FFE7D6 0%,#FFB98A 55%,#F2814A 100%)',
    ink: '#5A2108',
  },
  {
    occasion: 'Thank you',
    title: 'For the neighbour who always helps',
    quote: 'You fixed the gate, watched the kids and never asked for anything.',
    gift: 'Spa day',
    art: ['thanks', 'spa', 'sparkle'],
    field: 'linear-gradient(150deg,#D8F6EA 0%,#8FE0C1 55%,#2FB98A 100%)',
    ink: '#073D2B',
  },
  {
    occasion: 'Just because',
    title: 'A Tuesday that needed a lift',
    quote: 'No reason. I just saw this and thought of you.',
    gift: 'Signature perfume',
    art: ['perfume', 'gift', 'heart'],
    field: 'linear-gradient(150deg,#F1E1FF 0%,#CDA6FF 55%,#9A63F0 100%)',
    ink: '#33135C',
  },
];

interface Props {
  icon: (name: IconName, size: number) => React.ReactNode;
  /** Builds the link for a card ("send one like this"). */
  hrefFor: (occasion: string) => string;
  renderLink?: (href: string, className: string, children: React.ReactNode, label: string) => React.ReactNode;
}

export function MomentsGallery({ icon, hrefFor, renderLink }: Props) {
  const link = renderLink ?? ((href, className, children, label) => <a href={href} className={className} aria-label={label}>{children}</a>);
  return (
    <div className="gnm">
      <style>{CSS}</style>
      <ul className="gnm-track">
        {MOMENTS.map((m) => (
          <li key={m.title} className="gnm-item">
            {link(
              hrefFor(m.occasion === 'Thank you' ? 'Thank You' : m.occasion === 'Just because' ? 'Just Because' : m.occasion),
              'gnm-card',
              <>
                <span className="gnm-scene" style={{ background: m.field }} aria-hidden>
                  <span className="gnm-sun" />
                  <span className="gnm-a gnm-a1">{icon(m.art[0], 132)}</span>
                  <span className="gnm-a gnm-a2">{icon(m.art[1], 70)}</span>
                  <span className="gnm-a gnm-a3">{icon(m.art[2], 54)}</span>
                  <span className="gnm-tag" style={{ color: m.ink }}>{m.occasion}</span>
                </span>
                <span className="gnm-body">
                  <span className="gnm-title font-display">{m.title}</span>
                  <span className="gnm-quote">“{m.quote}”</span>
                  <span className="gnm-foot">
                    <span className="gnm-gift">{m.gift}</span>
                    <span className="gnm-cta">Send one like this</span>
                  </span>
                </span>
              </>,
              `${m.title} — send a ${m.occasion.toLowerCase()} gift like this`,
            )}
          </li>
        ))}
      </ul>
      <p className="gnm-note">Example messages, written to show what people send.</p>
    </div>
  );
}

const CSS = `
.gnm{position:relative}
.gnm-track{list-style:none;margin:0;padding:.25rem 1rem 1rem;display:grid;grid-auto-flow:column;grid-auto-columns:min(78vw,300px);gap:.9rem;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;margin-inline:-1rem}
.gnm-track::-webkit-scrollbar{display:none}
@media (min-width:1024px){.gnm-track{grid-auto-columns:calc((100% - 2*1.1rem)/3.15);gap:1.1rem;padding-inline:0;margin-inline:0}}
.gnm-item{scroll-snap-align:start;min-width:0}
.gnm-card{display:flex;flex-direction:column;height:100%;border-radius:1.6rem;background:#fff;border:1px solid #EEE2E9;overflow:hidden;color:#22101D;text-decoration:none;transition:border-color .25s,transform .35s cubic-bezier(.2,.8,.2,1)}
.gnm-card:hover{border-color:rgba(229,0,125,.35);transform:translateY(-4px)}
.gnm-card:focus-visible{outline:3px solid #E5007D;outline-offset:3px}
.gnm-scene{position:relative;display:block;height:210px;overflow:hidden}
.gnm-sun{position:absolute;left:50%;top:56%;width:190px;height:190px;margin:-95px 0 0 -95px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.75),rgba(255,255,255,0))}
.gnm-a{position:absolute;display:block;filter:drop-shadow(0 14px 18px rgba(40,0,20,.28));transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.gnm-a img{display:block;max-width:none}
.gnm-a1{left:50%;top:50%;margin:-62px 0 0 -66px}
.gnm-a2{left:12%;top:16%;transform:rotate(-12deg)}
.gnm-a3{right:12%;bottom:14%;transform:rotate(10deg)}
.gnm-card:hover .gnm-a1{transform:translateY(-8px) scale(1.04) rotate(-2deg)}
.gnm-card:hover .gnm-a2{transform:translate(-6px,-6px) rotate(-20deg)}
.gnm-card:hover .gnm-a3{transform:translate(6px,4px) rotate(18deg)}
.gnm-tag{position:absolute;left:1rem;top:1rem;padding:.3rem .7rem;border-radius:999px;background:rgba(255,255,255,.82);font-size:12px;font-weight:800}
.gnm-body{display:flex;flex-direction:column;gap:.45rem;padding:1.05rem 1.15rem 1.2rem;flex:1}
.gnm-title{font-size:1.12rem;font-weight:800;line-height:1.2;letter-spacing:-.01em}
.gnm-quote{font-size:14.5px;line-height:1.5;color:#6E5A68}
.gnm-foot{margin-top:auto;padding-top:.6rem;display:flex;align-items:center;justify-content:space-between;gap:.5rem;font-size:13px;font-weight:800}
.gnm-gift{padding:.3rem .65rem;border-radius:999px;background:#FFF0F7;color:#B4005E}
.gnm-cta{color:#22101D}
.gnm-card:hover .gnm-cta{color:#B4005E}
.gnm-note{margin:.2rem 0 0;font-size:12.5px;color:#6E5A68}
@media (prefers-reduced-motion: reduce){.gnm-card,.gnm-a{transition:none}.gnm-card:hover{transform:none}.gnm-card:hover .gnm-a1,.gnm-card:hover .gnm-a2,.gnm-card:hover .gnm-a3{transform:none}}
`;
