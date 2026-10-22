import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from 'sonner';

const appName = import.meta.env.VITE_APP_NAME || 'Giftnify';

createInertiaApp({
  title: (title) => title ? `${title} — ${appName}` : appName,
  // Each page loads on demand, so visitors download only what they open.
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.tsx');
    const page = pages[`./Pages/${name}.tsx`];
    if (!page) {
      throw new Error(`Page ${name} not found in Pages directory`);
    }
    return page() as Promise<any>;
  },
  setup({ el, App, props }) {
    const root = createRoot(el);
    root.render(
      <>
        <App {...props} />
        <Toaster position="top-center" richColors theme="light" toastOptions={{ style: { borderRadius: 16, fontFamily: 'Manrope, sans-serif' } }} />
      </>
    );
  },
  progress: {
    color: '#E5007D',
    showSpinner: false,
  },
});

// Installable app: register the service worker (static files only; data always live).
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
