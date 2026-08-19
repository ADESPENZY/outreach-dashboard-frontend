import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Catches render/lifecycle crashes in the routed pages and shows a branded
 * fallback instead of a blank white screen. Deliberately a class component —
 * error boundaries have no hook equivalent.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Surface the real crash for debugging — the boundary must never hide it.
    console.error('[ErrorBoundary] Route render crashed:', error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-neutral-dark shadow-sm p-8 text-center">
          <AlertTriangle size={32} className="mx-auto mb-4 text-red-500" aria-hidden="true" />
          <h1 className="font-montserrat font-bold text-2xl text-black-light leading-snug mb-2">
            Something went wrong
          </h1>
          <p className="font-roboto text-sm text-secondary-dark leading-relaxed mb-6">
            An unexpected error broke this page. Reloading usually fixes it.
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center w-full bg-gradient-to-r from-primary-light to-primary-dark text-white font-montserrat font-semibold rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all"
            >
              Reload
            </button>
            {/* Plain <a>, not <Link>: a full navigation resets both the crashed
                component tree and this boundary's error state. A client-side
                Link would route away while the fallback stayed stuck on screen. */}
            <a
              href="/"
              className="inline-flex items-center justify-center w-full font-roboto text-secondary-dark hover:text-black-light hover:bg-neutral rounded-lg px-3 py-2 transition-colors"
            >
              Go to Home
            </a>
          </div>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
