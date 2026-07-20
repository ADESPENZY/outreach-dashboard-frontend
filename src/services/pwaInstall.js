/**
 * pwaInstall.js — single shared owner of the PWA install prompt.
 *
 * Chrome fires `beforeinstallprompt` ONCE, early — often before a React
 * component's useEffect has registered a listener. Capturing it here at module
 * scope (imported first thing in main.jsx) guarantees we never miss it, and
 * gives every UI (the popup card, the persistent Install button) one shared
 * source of truth instead of competing listeners.
 */

let deferredPrompt = null;
const subscribers = new Set();

function notify() {
  subscribers.forEach((cb) => {
    try { cb(deferredPrompt); } catch { /* subscriber's problem */ }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();          // we'll show our own UI
    deferredPrompt = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

export function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function isIOS() {
  const ua = window.navigator.userAgent || '';
  return (
    (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** The captured install event, or null (not fired / already used / installed). */
export function getInstallPrompt() {
  return deferredPrompt;
}

/** Be told when the prompt becomes available or is consumed. Returns unsubscribe. */
export function onInstallPromptChange(cb) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

/** Fire the native install dialog. Returns 'accepted' | 'dismissed' | 'unavailable'. */
export async function triggerInstall() {
  if (!deferredPrompt) return 'unavailable';
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    deferredPrompt = null;
    notify();
  }
  return outcome;
}
