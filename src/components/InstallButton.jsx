import { useEffect, useRef, useState } from 'react';
import { Download, Share, Plus, X } from 'lucide-react';
import {
  isStandalone, isIOS, getInstallPrompt, onInstallPromptChange, triggerInstall,
} from '../services/pwaInstall';

/**
 * Persistent "Install app" button — a permanent entry point, unlike the
 * dismissable InstallPrompt card. Hidden only when already running installed.
 *
 *  • Chrome/Android/Edge with the captured event → one-tap native install.
 *  • iOS (no API exists) → small popover with the Share → Add to Home Screen steps.
 *  • Anything else → popover with the browser-menu route.
 */
export default function InstallButton({ className = '' }) {
  const [installed, setInstalled] = useState(() => isStandalone());
  const [canOneTap, setCanOneTap] = useState(() => !!getInstallPrompt());
  const [showHelp, setShowHelp] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => onInstallPromptChange((p) => {
    setCanOneTap(!!p);
    if (isStandalone()) setInstalled(true);
  }), []);

  // Close the help popover on outside tap.
  useEffect(() => {
    if (!showHelp) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowHelp(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [showHelp]);

  if (installed) return null;

  const onClick = async () => {
    if (canOneTap) {
      const outcome = await triggerInstall();
      if (outcome === 'accepted') setInstalled(true);
      return;
    }
    setShowHelp((v) => !v);
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5
                   px-3.5 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-sm
                   hover:bg-white/10 hover:text-white hover:border-white/25 transition-all"
      >
        <Download className="w-3.5 h-3.5" />
        Install app
      </button>

      {showHelp && (
        <div className="absolute right-0 top-full mt-2 w-72 z-50 rounded-2xl border border-white/10
                        bg-[#12131C]/95 backdrop-blur-md p-4 shadow-2xl animate-fade-in text-left">
          <button
            onClick={() => setShowHelp(false)}
            aria-label="Close"
            className="absolute top-2.5 right-2.5 p-1 rounded-lg text-white/40 hover:text-white/80 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <p className="text-sm font-bold text-white mb-2">Install ApplyDir</p>
          {isIOS() ? (
            <ol className="space-y-1.5 text-xs text-white/70 leading-relaxed list-none">
              <li className="flex items-center gap-2">
                1. Tap the <Share className="w-3.5 h-3.5 inline text-white/90" /> Share icon in Safari
              </li>
              <li className="flex items-center gap-2">
                2. Scroll down and tap <span className="font-semibold text-white/90 inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Add to Home Screen</span>
              </li>
              <li>3. Tap <span className="font-semibold text-white/90">Add</span> — the app lands on your home screen</li>
            </ol>
          ) : (
            <p className="text-xs text-white/70 leading-relaxed">
              Open your browser menu (⋮) and choose <span className="font-semibold text-white/90">“Install ApplyDir”</span> /
              “Add to Home screen” — or look for the install icon in the address bar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
