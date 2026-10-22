import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

const KEY = 'giftnify.install.dismissed';

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

/**
 * "Get the app" card on phones. The app is this website installed to the home
 * screen, so it always has the same account, gifts and wallet.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(KEY) === '1'; } catch { /* storage blocked */ }
    if (dismissed || isStandalone() || window.innerWidth >= 768) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    let t: ReturnType<typeof setTimeout> | undefined;
    if (isIos()) {
      t = setTimeout(() => { setIos(true); setShow(true); }, 4000);
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      if (t) clearTimeout(t);
    };
  }, []);

  const close = () => {
    setShow(false);
    try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setDeferred(null);
    close();
  };

  if (!show) return null;

  return (
    <div role="dialog" aria-label="Install the Giftnify app" className="fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 rounded-[1.5rem] border border-line bg-white p-4 shadow-card md:hidden">
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" className="size-12 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-ink">Get the Giftnify app</p>
          {ios ? (
            <p className="mt-0.5 text-sm text-ink-soft">
              Tap <Share className="inline size-4 align-text-bottom" aria-label="Share" /> then “Add to Home Screen”.
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-ink-soft">Open gifts and your wallet in one tap. Same account as the website.</p>
          )}
        </div>
        <button type="button" onClick={close} aria-label="Not now" className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-muted">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      {!ios && (
        <button type="button" onClick={install} className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-primary font-extrabold text-white shadow-glow">
          <Download className="size-4" aria-hidden /> Install
        </button>
      )}
    </div>
  );
}
