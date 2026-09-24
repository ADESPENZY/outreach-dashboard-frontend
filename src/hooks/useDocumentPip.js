import { useCallback, useEffect, useState } from 'react';

// ── useDocumentPip — a floating always-on-top window (Document Picture-in-Picture)
//
// The page renders INTO the returned window with a React portal, so the
// floating view is the same components on the same state — not a copy.
//
// Facts this relies on (WICG spec + Chrome docs):
//   * requestWindow() needs a user gesture AND CONSUMES it. Anything else in
//     the same click that needs one (getDisplayMedia) must run first.
//   * A second requestWindow() closes the first window.
//   * Styles are NOT copied: the window starts as a blank document, so every
//     stylesheet is copied in (cross-origin ones as <link>, since their rules
//     can't be read).
//   * "pagehide" fires on the window when it closes, however it was closed.
//   * Chromium desktop (Chrome/Edge 116+); not Safari, not mobile.

// Wide and shallow: it sits over a video call, and the answer reads in two or
// three lines rather than a narrow column. Clamped so it always fits the screen.
const WANTED = { width: 760, height: 320 };

function windowSize() {
  const maxW = (window.screen?.availWidth || 1280) - 40;
  const maxH = (window.screen?.availHeight || 800) - 40;
  return {
    width: Math.max(360, Math.min(WANTED.width, maxW)),
    height: Math.max(240, Math.min(WANTED.height, maxH)),
  };
}

function copyStyles(target) {
  for (const sheet of [...document.styleSheets]) {
    try {
      const style = target.createElement('style');
      style.textContent = [...sheet.cssRules].map((rule) => rule.cssText).join('\n');
      target.head.appendChild(style);
    } catch {
      if (!sheet.href) continue;
      const link = target.createElement('link');
      link.rel = 'stylesheet';
      link.href = sheet.href;
      target.head.appendChild(link);
    }
  }
}

export function useDocumentPip() {
  const supported = typeof window !== 'undefined' && 'documentPictureInPicture' in window;
  const [pipWindow, setPipWindow] = useState(null);

  /** Open (or return the already-open) window. Must be called from a user gesture. */
  const open = useCallback(async () => {
    if (!supported) return null;
    const existing = window.documentPictureInPicture.window;
    if (existing) return existing;
    const win = await window.documentPictureInPicture.requestWindow(windowSize());
    copyStyles(win.document);
    win.document.title = 'ApplyDir · Live answers';
    // The panel is the whole window: dark surface, no chrome, no scroll of its own.
    win.document.documentElement.className = 'h-full';
    win.document.body.className = 'm-0 h-full bg-overlay text-overlay-text font-roboto overflow-hidden';
    win.addEventListener('pagehide', () => {
      setPipWindow((current) => (current === win ? null : current));
    }, { once: true });
    setPipWindow(win);
    return win;
  }, [supported]);

  const close = useCallback(() => {
    const win = supported ? window.documentPictureInPicture.window : null;
    if (win) win.close();
  }, [supported]);

  // Leaving the page takes the floating window with it.
  useEffect(() => close, [close]);

  return { supported, pipWindow, open, close };
}
