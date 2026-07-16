import { useEffect, useState, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { pushAvailableHere, permissionState, isPushEnabled, enablePush } from '../services/push';

/**
 * Gentle push opt-in, shown once the user has had a "win" (sent their first
 * intro — set via localStorage 'applydirPushWin'). We only surface it when a
 * ping would obviously be useful: they've reached out and are now waiting on
 * replies. Never shown if push isn't available here (e.g. iOS Safari that isn't
 * installed), already granted/denied, or dismissed.
 */

const DISMISS_KEY = 'applydirPushPromptDismissed';
const WIN_KEY = 'applydirPushWin';
const DISMISS_DAYS = 21;

function recentlyDismissed() {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY));
    return ts && Date.now() - ts < DISMISS_DAYS * 864e5;
  } catch { return false; }
}

export default function PushPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pushAvailableHere()) return;
      if (permissionState() !== 'default') return;      // already granted or blocked
      if (recentlyDismissed()) return;
      if (localStorage.getItem(WIN_KEY) !== '1') return; // wait for a real win
      if (await isPushEnabled()) return;
      if (!cancelled) {
        // small delay so it doesn't collide with the boot / other toasts
        setTimeout(() => !cancelled && setVisible(true), 1800);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
  }, []);

  const turnOn = useCallback(async () => {
    setBusy(true);
    const ok = await enablePush();
    setBusy(false);
    setVisible(false);
    if (ok) {
      toast.success("Notifications on — we'll ping you the moment someone replies.");
    } else {
      // Permission denied or unsupported — don't nag again.
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[94] flex justify-center px-3 pointer-events-none
                    pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto relative w-full max-w-md bg-white rounded-2xl border border-neutral-dark
                      shadow-[0_16px_50px_-12px_rgba(0,0,0,0.3)] p-4 animate-fade-in font-roboto"
           role="dialog" aria-label="Enable notifications">
        <button onClick={dismiss} aria-label="Dismiss"
                className="absolute top-2.5 right-2.5 p-1 rounded-lg text-secondary-dark/50 hover:text-black-light hover:bg-neutral transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="bg-gradient-to-br from-primary-light to-primary-dark p-2.5 rounded-xl shadow-lg shadow-primary-light/30 shrink-0">
            <Bell className="text-white w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold font-montserrat text-black-light text-sm">
              Get pinged when they reply
            </p>
            <p className="text-xs text-secondary-dark mt-0.5 leading-relaxed">
              Your intro is out. Turn on notifications and we'll tell you the second someone
              replies — no need to keep checking.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={turnOn} disabled={busy}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark
                                 text-white text-sm font-semibold font-montserrat rounded-xl px-4 py-2 shadow-sm
                                 hover:opacity-90 transition-all disabled:opacity-60">
                <Bell className="w-4 h-4" /> {busy ? 'Enabling…' : 'Turn on'}
              </button>
              <button onClick={dismiss}
                      className="text-xs font-semibold text-secondary-dark hover:text-black-light px-2 py-2">
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
