import React, { useState } from 'react';

/**
 * The home page's signature moment: a looping, 10-second film of what a
 * recipient actually sees — sealed box, the message plays, 3·2·1, the box
 * bursts open and the sender's name and gift appear.
 *
 * Pure CSS animation (no libraries), so the website and the app share this
 * exact file. Keep both copies identical:
 *   resources/js/Components/stage/RevealStage.tsx
 *   src/components/giftnify/stage/RevealStage.tsx
 *
 * Reduced motion: shows the opened, revealed frame without animating.
 */

type IconName = 'gift' | 'gift-open' | 'heart' | 'sparkle' | 'cake' | 'money';

interface Props {
  /** Renders one piece of 3D artwork. Each app passes its own image source. */
  icon: (name: IconName, size: number) => React.ReactNode;
  /** Where "Open a sample gift" goes. */
  sampleHref?: string;
  /** Link component; defaults to a plain <a>. */
  renderLink?: (href: string, className: string, children: React.ReactNode) => React.ReactNode;
}

const CONFETTI = [
  { x: -150, y: -120, r: 260, c: '#FF4FA7' }, { x: -110, y: -170, r: -200, c: '#FFD166' },
  { x: -40, y: -190, r: 320, c: '#ffffff' }, { x: 30, y: -185, r: -280, c: '#7CE0C3' },
  { x: 100, y: -165, r: 240, c: '#FF4FA7' }, { x: 155, y: -115, r: -300, c: '#FFD166' },
  { x: -170, y: -40, r: 200, c: '#7CE0C3' }, { x: 170, y: -45, r: -220, c: '#ffffff' },
  { x: -135, y: 40, r: 280, c: '#FFD166' }, { x: 140, y: 35, r: -260, c: '#FF4FA7' },
  { x: -75, y: -150, r: 180, c: '#B794FF' }, { x: 75, y: -140, r: -180, c: '#B794FF' },
  { x: -10, y: -130, r: 360, c: '#FFD166' }, { x: -190, y: -95, r: -320, c: '#ffffff' },
  { x: 190, y: -90, r: 300, c: '#7CE0C3' }, { x: 0, y: -210, r: -240, c: '#FF4FA7' },
];

const BARS = [6, 14, 9, 18, 11, 22, 8, 16, 12, 20, 7, 15, 10, 19, 9, 13];

export function RevealStage({ icon, sampleHref, renderLink }: Props) {
  const [paused, setPaused] = useState(false);
  const link = renderLink ?? ((href, className, children) => <a href={href} className={className}>{children}</a>);

  return (
    <figure className="gns" data-paused={paused || undefined} aria-label="Preview: a sealed gift plays its message, counts down, then reveals it is from Seun with ₦25,000 inside.">
      <style>{CSS}</style>

      <div className="gns-card">
        <div className="gns-glow" aria-hidden />

        {/* Status chip: Sealed → Opened */}
        <div className="gns-top" aria-hidden>
          <span className="gns-chip gns-chip-sealed"><Lock /> Sealed gift</span>
          <span className="gns-chip gns-chip-open"><Spark /> Opened just now</span>
          <span className="gns-for">For Tolu</span>
        </div>

        {/* The box */}
        <div className="gns-boxwrap" aria-hidden>
          <div className="gns-rays" />
          <div className="gns-float">
            <div className="gns-box gns-box-sealed">{icon('gift', 168)}</div>
            <div className="gns-box gns-box-open">{icon('gift-open', 168)}</div>
          </div>
          {CONFETTI.map((p, i) => (
            <i
              key={i}
              className="gns-bit"
              style={{ '--x': `${p.x}px`, '--y': `${p.y}px`, '--r': `${p.r}deg`, background: p.c, animationDelay: `${(i % 4) * 0.03}s` } as React.CSSProperties}
            />
          ))}
          <span className="gns-orbit gns-o1">{icon('heart', 54)}</span>
          <span className="gns-orbit gns-o2">{icon('sparkle', 46)}</span>
          <span className="gns-orbit gns-o3">{icon('cake', 50)}</span>
        </div>

        {/* Countdown */}
        <div className="gns-count font-display" aria-hidden>
          <span className="gns-n gns-n3">3</span>
          <span className="gns-n gns-n2">2</span>
          <span className="gns-n gns-n1">1</span>
        </div>

        {/* Bottom: hint → message → reveal */}
        <div className="gns-bottom" aria-hidden>
          <div className="gns-hint">
            <span className="gns-label">A hint</span>
            <p>Someone who has known you since before you were this version of yourself.</p>
          </div>

          <div className="gns-msg">
            <div className="gns-msg-head">
              <span className="gns-mic"><Mic /></span>
              <span className="gns-wave">
                {BARS.map((h, i) => <i key={i} style={{ height: h, animationDelay: `${i * 0.07}s` }} />)}
              </span>
              <span className="gns-time">0:24</span>
            </div>
            <p className="gns-l gns-l1">Happy birthday Tolu.</p>
            <p className="gns-l gns-l2">You deserve the world.</p>
            <p className="gns-l gns-l3">Buy yourself something great from me.</p>
          </div>

          <p className="gns-wait">Message finished. Revealing who it's from…</p>

          <div className="gns-reveal">
            <span className="gns-label">It's from</span>
            <p className="gns-name font-display">Seun Balogun</p>
            <p className="gns-amount font-display">₦25,000 <small>added to your wallet</small></p>
          </div>
        </div>

        <div className="gns-progress" aria-hidden><i /></div>
      </div>

      <figcaption className="gns-caption">
        <span>What they see when your gift arrives.</span>
        <span className="gns-actions">
          <button type="button" className="gns-btn" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
            {paused ? 'Play' : 'Pause'}
          </button>
          {sampleHref && link(sampleHref, 'gns-btn gns-btn-strong', <>Try it yourself</>)}
        </span>
      </figcaption>
    </figure>
  );
}

function Lock() {
  return <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
}
function Spark() {
  return <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" /></svg>;
}
function Mic() {
  return <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
}

/* One 10s timeline. 1s = 10% of the keyframes. */
const CSS = `
.gns{margin:0;width:100%;max-width:440px;justify-self:center}
.gns-card{position:relative;overflow:hidden;aspect-ratio:4/5;border-radius:2rem;color:#fff;isolation:isolate;
  background:radial-gradient(90% 60% at 80% 0%,rgba(229,0,125,.35),transparent 60%),radial-gradient(120% 80% at 0% 100%,#4A1538,transparent 60%),#2A0B1F;
  box-shadow:0 30px 80px -30px rgba(122,0,64,.55),0 0 0 1px rgba(255,255,255,.06) inset}
.gns-glow{position:absolute;inset:auto -20% -30% -20%;height:60%;background:radial-gradient(closest-side,rgba(229,0,125,.35),transparent);animation:gns-glow 10s infinite;z-index:-1}
.gns-top{position:absolute;inset:1.1rem 1.1rem auto;display:flex;align-items:center;gap:.5rem;font-size:12px;font-weight:700}
.gns-chip{position:absolute;left:0;display:inline-flex;align-items:center;gap:.35rem;padding:.38rem .7rem;border-radius:999px;background:rgba(255,255,255,.1);backdrop-filter:blur(6px)}
.gns-chip-open{background:#E5007D;opacity:0;animation:gns-chip-open 10s infinite}
.gns-chip-sealed{animation:gns-chip-sealed 10s infinite}
.gns-for{margin-left:auto;opacity:.6}
.gns-boxwrap{position:absolute;left:50%;top:39%;width:0;height:0}
.gns-float{position:absolute;left:-84px;top:-84px;width:168px;height:168px;animation:gns-float 3.2s ease-in-out infinite}
.gns-box{position:absolute;inset:0;display:grid;place-items:center;filter:drop-shadow(0 18px 30px rgba(0,0,0,.45))}
.gns-box img{width:168px;height:168px;object-fit:contain}
.gns-box-sealed{animation:gns-sealed 10s infinite}
.gns-box-open{opacity:0;animation:gns-open 10s infinite}
.gns-rays{position:absolute;left:-180px;top:-180px;width:360px;height:360px;border-radius:50%;opacity:0;
  background:repeating-conic-gradient(from 0deg,rgba(255,209,102,.28) 0 8deg,transparent 8deg 22deg);
  -webkit-mask:radial-gradient(closest-side,#000 30%,transparent);mask:radial-gradient(closest-side,#000 30%,transparent);animation:gns-rays 10s infinite}
.gns-bit{position:absolute;left:-4px;top:-6px;width:8px;height:12px;border-radius:2px;opacity:0;animation:gns-bit 10s infinite cubic-bezier(.15,.7,.3,1)}
.gns-orbit{position:absolute;opacity:0;filter:drop-shadow(0 10px 16px rgba(0,0,0,.35))}
.gns-orbit img,.gns-box img{display:block;max-width:none}
.gns-o1{left:-150px;top:-40px;animation:gns-o1 10s infinite}
.gns-o2{left:105px;top:-110px;animation:gns-o2 10s infinite}
.gns-o3{left:100px;top:20px;animation:gns-o3 10s infinite}
.gns-count{position:absolute;left:0;right:0;top:39%;height:0;display:grid;place-items:center}
.gns-n{position:absolute;font-size:7.5rem;font-weight:800;line-height:1;opacity:0;text-shadow:0 10px 40px rgba(229,0,125,.8)}
.gns-n3{animation:gns-n3 10s infinite}.gns-n2{animation:gns-n2 10s infinite}.gns-n1{animation:gns-n1 10s infinite}
.gns-bottom{position:absolute;left:1rem;right:1rem;bottom:1.4rem;height:42%}
.gns-hint,.gns-msg,.gns-reveal{position:absolute;inset:auto 0 0 0;border-radius:1.25rem;padding:1rem 1.1rem}
.gns-hint{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);animation:gns-hint 10s infinite}
.gns-hint p{margin:.25rem 0 0;font-weight:700;font-size:15px;line-height:1.35}
.gns-label{font-size:12px;font-weight:800;color:#FF8CC6}
.gns-msg{background:#fff;color:#22101D;opacity:0;animation:gns-msg 10s infinite;box-shadow:0 20px 40px -20px rgba(0,0,0,.6)}
.gns-msg-head{display:flex;align-items:center;gap:.6rem;margin-bottom:.55rem}
.gns-mic{display:grid;place-items:center;width:30px;height:30px;border-radius:999px;background:#E5007D;color:#fff;flex:none}
.gns-wave{display:flex;align-items:center;gap:3px;height:24px;flex:1}
.gns-wave i{display:block;width:3px;border-radius:3px;background:#E5007D;transform-origin:center;animation:gns-bar .9s ease-in-out infinite alternate}
.gns-time{font-size:12px;font-weight:700;color:#6E5A68}
.gns-l{margin:0;font-weight:700;font-size:15px;line-height:1.4;opacity:0}
.gns-l1{animation:gns-l1 10s infinite}.gns-l2{animation:gns-l2 10s infinite}.gns-l3{animation:gns-l3 10s infinite}
.gns-wait{position:absolute;inset:auto 0 1rem 0;margin:0;text-align:center;font-weight:700;font-size:14px;color:rgba(255,255,255,.75);opacity:0;animation:gns-wait 10s infinite}
.gns-reveal{text-align:center;opacity:0;animation:gns-reveal 10s infinite}
.gns-name{margin:.1rem 0 0;font-size:2.1rem;font-weight:800;letter-spacing:-.03em;line-height:1.05}
.gns-amount{display:inline-flex;align-items:baseline;gap:.45rem;margin:.7rem 0 0;padding:.45rem .9rem;border-radius:999px;background:#fff;color:#B4005E;font-size:1.35rem;font-weight:800}
.gns-amount small{font-family:Manrope,system-ui,sans-serif;font-size:12px;font-weight:700;color:#6E5A68}
.gns-progress{position:absolute;left:1.2rem;right:1.2rem;bottom:.6rem;height:3px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}
.gns-progress i{display:block;height:100%;width:100%;background:#FF4FA7;transform-origin:left;animation:gns-prog 10s linear infinite}
.gns-caption{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.75rem;margin-top:.9rem;font-size:14px;font-weight:600;color:#6E5A68}
.gns-actions{display:flex;gap:.5rem}
.gns-btn{display:inline-flex;align-items:center;height:2.5rem;padding:0 1rem;border-radius:999px;border:1px solid #EEE2E9;background:#fff;color:#22101D;font-weight:800;font-size:14px;cursor:pointer;text-decoration:none}
.gns-btn:hover{border-color:rgba(34,16,29,.25)}
.gns-btn-strong{background:#22101D;border-color:#22101D;color:#fff}
.gns-btn-strong:hover{background:#4A1538}
.gns-btn:focus-visible{outline:3px solid #E5007D;outline-offset:2px}
.gns[data-paused] *{animation-play-state:paused!important}

@keyframes gns-float{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-10px) rotate(3deg)}}
@keyframes gns-glow{0%,58%{opacity:.5}64%,90%{opacity:1}100%{opacity:.5}}
@keyframes gns-chip-sealed{0%,59%{opacity:1}61%,96%{opacity:0}100%{opacity:1}}
@keyframes gns-chip-open{0%,60%{opacity:0;transform:scale(.8)}63%,95%{opacity:1;transform:scale(1)}98%,100%{opacity:0}}
@keyframes gns-sealed{0%,41%{opacity:1;transform:scale(1)}44%,58%{transform:scale(1.04)}
  54%{transform:rotate(-6deg) scale(1.05)}55%{transform:rotate(6deg) scale(1.05)}56%{transform:rotate(-8deg) scale(1.07)}57%{transform:rotate(8deg) scale(1.07)}58%{transform:rotate(-4deg) scale(1.1)}
  60%{opacity:1;transform:scale(1.2)}61%,97%{opacity:0;transform:scale(1.3)}100%{opacity:1;transform:scale(1)}}
@keyframes gns-open{0%,60%{opacity:0;transform:scale(.6)}63%{opacity:1;transform:scale(1.12)}66%,94%{opacity:1;transform:scale(1)}97%,100%{opacity:0;transform:scale(.9)}}
@keyframes gns-rays{0%,60%{opacity:0;transform:scale(.4) rotate(0)}64%{opacity:1;transform:scale(1) rotate(20deg)}94%{opacity:.8;transform:scale(1.05) rotate(90deg)}97%,100%{opacity:0;transform:scale(1) rotate(100deg)}}
@keyframes gns-bit{0%,60%{opacity:0;transform:translate(0,0) rotate(0)}61%{opacity:1}74%{opacity:1;transform:translate(var(--x),var(--y)) rotate(var(--r))}
  84%{opacity:0;transform:translate(calc(var(--x) * 1.15),calc(var(--y) * .4 + 120px)) rotate(calc(var(--r) * 1.6))}100%{opacity:0}}
@keyframes gns-o1{0%,61%{opacity:0;transform:translate(150px,40px) scale(.3)}67%,94%{opacity:1;transform:translate(0,0) scale(1) rotate(-10deg)}80%{transform:translate(0,-8px) scale(1) rotate(-4deg)}97%,100%{opacity:0}}
@keyframes gns-o2{0%,62%{opacity:0;transform:translate(-105px,110px) scale(.3)}68%,94%{opacity:1;transform:translate(0,0) scale(1) rotate(12deg)}82%{transform:translate(0,6px) scale(1) rotate(4deg)}97%,100%{opacity:0}}
@keyframes gns-o3{0%,63%{opacity:0;transform:translate(-100px,-20px) scale(.3)}69%,94%{opacity:1;transform:translate(0,0) scale(1) rotate(8deg)}84%{transform:translate(0,-6px) scale(1) rotate(-2deg)}97%,100%{opacity:0}}
@keyframes gns-n3{0%,41%{opacity:0;transform:scale(1.8)}42%{opacity:1;transform:scale(1.8)}46%{opacity:1;transform:scale(1)}48%,100%{opacity:0;transform:scale(.7)}}
@keyframes gns-n2{0%,47%{opacity:0;transform:scale(1.8)}48%{opacity:1;transform:scale(1.8)}52%{opacity:1;transform:scale(1)}54%,100%{opacity:0;transform:scale(.7)}}
@keyframes gns-n1{0%,53%{opacity:0;transform:scale(1.8)}54%{opacity:1;transform:scale(1.8)}58%{opacity:1;transform:scale(1)}60%,100%{opacity:0;transform:scale(.7)}}
@keyframes gns-hint{0%,12%{opacity:1;transform:translateY(0)}15%,97%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}
@keyframes gns-msg{0%,14%{opacity:0;transform:translateY(24px)}17%,39%{opacity:1;transform:translateY(0)}42%,100%{opacity:0;transform:translateY(-8px) scale(.97)}}
@keyframes gns-l1{0%,18%{opacity:0;transform:translateY(6px)}21%,100%{opacity:1;transform:none}}
@keyframes gns-l2{0%,24%{opacity:0;transform:translateY(6px)}27%,100%{opacity:1;transform:none}}
@keyframes gns-l3{0%,30%{opacity:0;transform:translateY(6px)}33%,100%{opacity:1;transform:none}}
@keyframes gns-bar{from{transform:scaleY(.35)}to{transform:scaleY(1)}}
@keyframes gns-reveal{0%,62%{opacity:0;transform:translateY(16px) scale(.96)}66%,94%{opacity:1;transform:none}97%,100%{opacity:0}}
@keyframes gns-wait{0%,41%{opacity:0}43%,58%{opacity:1}60%,100%{opacity:0}}
@keyframes gns-prog{from{transform:scaleX(0)}to{transform:scaleX(1)}}

@media (prefers-reduced-motion: reduce){
  .gns *{animation:none!important}
  .gns-chip-sealed,.gns-hint,.gns-msg,.gns-box-sealed,.gns-n,.gns-bit,.gns-wait{opacity:0!important}
  .gns-chip-open,.gns-box-open,.gns-reveal,.gns-orbit{opacity:1!important}
  .gns-rays{opacity:.7}
  .gns-progress{display:none}
  .gns-actions .gns-btn:first-child{display:none}
}
@media (max-width:380px){.gns-n{font-size:6rem}.gns-name{font-size:1.8rem}.gns-hint p,.gns-l{font-size:14px}}
`;
