import { useEffect, useState, useCallback } from'react';
import { Rocket, X, Share, Plus, Download } from'lucide-react';
import { getInstallPrompt, onInstallPromptChange, triggerInstall } from'../services/pwaInstall';

/**
 * PWA install prompt — installability differs sharply by platform:
 *
 * • Android / desktop Chrome fire a`beforeinstallprompt` event we can capture
 * and replay from a button → a true one-tap install.
 * • iOS Safari fires NOTHING. The only way to install is the manual
 * Share →"Add to Home Screen" flow, so there we show instructions.
 *
 * Already-installed users (running standalone) never see this. Dismissals are
 * remembered so we don't nag.
 */

const DISMISS_KEY ='applydirInstallDismissed';
const DISMISS_DAYS = 14;

function isStandalone() {
 return (
 window.matchMedia?.('(display-mode: standalone)').matches ||
 // iOS Safari exposes this non-standard flag when launched from the home screen
 window.navigator.standalone === true
 );
}

function isIOS() {
 const ua = window.navigator.userAgent ||'';
 const iOSDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
 // iPadOS 13+ reports as Mac; detect the touch-Mac case too
 const iPadOS = navigator.platform ==='MacIntel' && navigator.maxTouchPoints > 1;
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
 // The one-shot beforeinstallprompt event is owned by services/pwaInstall
 // (captured at module load, before React mounts) — this card and the
 // persistent InstallButton both read from that single source instead of
 // racing each other with their own listeners.
 const [canOneTap, setCanOneTap] = useState(() => !!getInstallPrompt());
 const [visible, setVisible] = useState(false);
 const [iosMode, setIosMode] = useState(false);

 useEffect(() => {
 if (isStandalone() || recentlyDismissed()) return undefined;

 const unsub = onInstallPromptChange((p) => {
 setCanOneTap(!!p);
 if (p) setVisible(true);
 else setVisible(false); // installed or consumed
 });
 if (getInstallPrompt()) setVisible(true);

 // iOS gives us no event — decide from UA. Only nudge on the phone, where
 //"Add to Home Screen" actually exists.
 let t;
 if (isIOS() && isMobile()) {
 setIosMode(true);
 // small delay so it doesn't fight the first paint / boot loader
 t = setTimeout(() => setVisible(true), 2500);
 }
 return () => {
 unsub();
 if (t) clearTimeout(t);
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
 if (!canOneTap) return;
 const outcome = await triggerInstall();
 setVisible(false);
 if (outcome !=='accepted') dismiss();
 }, [canOneTap, dismiss]);

 if (!visible) return null;

 return (
 <div
 className="fixed inset-x-0 bottom-0 z-[95] flex justify-center px-3 pointer-events-none
 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
 >
 <div
 className="pointer-events-auto relative w-full max-w-md bg-white rounded-2xl border border-neutral-dark
 shadow-[0_16px_50px_-12px_rgba(0,0,0,0.3)] p-4 animate-fade-in"
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
 <p className="font-bold text-black-light text-sm">
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
 text-white text-sm font-semibold rounded-xl px-4 py-2 shadow-sm
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
