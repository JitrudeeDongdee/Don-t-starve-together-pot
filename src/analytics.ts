// Google Analytics 4 — loads only when VITE_GA_ID is set (e.g. in .env.local
// or the hosting provider's env settings). No ID -> completely inert.

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;

export function initAnalytics(): void {
  if (!GA_ID) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
}

/** Custom event helper (no-op without GA_ID). */
export function track(event: string, params?: Record<string, unknown>): void {
  if (!GA_ID || typeof window.gtag !== 'function') return;
  window.gtag('event', event, params ?? {});
}
