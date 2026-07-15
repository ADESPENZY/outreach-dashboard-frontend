import { useEffect, useState, useCallback } from 'react';
import { Rocket, X, Share, Plus, Download } from 'lucide-react';

/**
 * PWA install prompt — installability differs sharply by platform:
 *
 *  • Android / desktop Chrome fire a `beforeinstallprompt` event we can capture
 *    and replay from a button → a true one-tap install.
 *  • iOS Safari fires NOTHING. The only way to install is the manual
 *    Share → "Add to Home Screen" flow, so there we show instructions.
 *
 * Already-installed users (running standalone) never see this. Dismissals are
 * remembered so we don't nag.
 */

const DISMISS_KEY = 'applydirInstallDismissed';
const DISMISS_DAYS = 14;

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag when launched from the home screen
    window.navigator.standalone === true
  );
}

function isIOS() {
  const ua = window.navigator.userAgent || '';
  const iOSDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  // iPadOS 13+ reports as Mac; detect the touch-Mac case too
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

function isMobile() {
  return window.matchMedia?.('(max-width: 768px)').matches;
}

function recentlyDismissed() {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY));
    if (!ts) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return undefined;

    // Android / desktop Chrome: capture the install event for a one-tap button.
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // iOS gives us no event — decide from UA. Only nudge on the phone, where
    // "Add to Home Screen" actually exists.
    if (isIOS() && isMobile()) {
      setIosMode(true);
      // small delay so it doesn't fight the first paint / boot loader
      const t = setTimeout(() => setVisible(true), 2500);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      };
    }

    // Hide again if the app gets installed while the prompt is showing.
    const onInstalled = () => setVisible(false);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
    if (outcome !== 'accepted') dismiss();
  }, [deferredPrompt, dismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[95] flex justify-center px-3 pointer-events-none
                 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
      <div
        className="pointer-events-auto relative w-full max-w-md bg-white rounded-2xl border border-neutral-dark
                   shadow-[0_16px_50px_-12px_rgba(0,0,0,0.3)] p-4 animate-fade-in font-roboto"
        role="dialog"
        aria-label="Install ApplyDir"
      >
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-2.5 right-2.5 p-1 rounded-lg text-secondary-dark/50 hover:text-black-light hover:bg-neutral transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="bg-gradient-to-br from-primary-light to-primary-dark p-2.5 rounded-xl shadow-lg shadow-primary-light/30 shrink-0">
            <Rocket className="text-white w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold font-montserrat text-black-light text-sm">
              Install ApplyDir
            </p>

            {iosMode ? (
              <>
                <p className="text-xs text-secondary-dark mt-0.5 leading-relaxed">
                  Add it to your home screen for a full-screen app and reply alerts.
                </p>
                <p className="mt-2 text-xs text-black-light flex items-center flex-wrap gap-1.5">
                  Tap
                  <span className="inline-flex items-center gap-1 font-semibold text-primary-dark">
                    <Share className="w-3.5 h-3.5" /> Share
                  </span>
                  then
                  <span className="inline-flex items-center gap-1 font-semibold text-primary-dark">
                    <Plus className="w-3.5 h-3.5" /> Add to Home Screen
                  </span>
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-secondary-dark mt-0.5 leading-relaxed">
                  Get a full-screen app on your home screen, with reply alerts.
                </p>
                <button
                  onClick={install}
                  className="mt-3 inline-flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark
                             text-white text-sm font-semibold font-montserrat rounded-xl px-4 py-2 shadow-sm
                             hover:opacity-90 transition-all"
                >
                  <Download className="w-4 h-4" /> Install app
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
