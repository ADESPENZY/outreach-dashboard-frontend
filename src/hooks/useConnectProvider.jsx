import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { getGmailOAuthUrl, getOutlookOAuthUrl } from '@/services/apiGmail';
import ConnectExplainerModal from '@/components/ConnectExplainerModal';

/**
 * useConnectProvider — the ONE owner of the "connect an inbox" flow, shared by
 * every entry point (Settings, NoInboxModal first-run, …) so no call site can
 * drift or skip a step (e.g. NoInboxModal must not bypass the Gmail explainer).
 *
 * Flow per provider:
 *   • Gmail     → open the pre-consent explainer (Google's unverified-app
 *                 warning) → getGmailOAuthUrl() → redirect.
 *   • Outlook   → straight to getOutlookOAuthUrl() → redirect (no such warning).
 *   • reconnect → skip the explainer (the user already consented once).
 *
 * Returns `explainer` — a ready-to-render modal element; drop it into the
 * consumer's JSX so the explainer can never be forgotten by a call site.
 *
 * FUTURE GATE: an invite-code check belongs in `connectGoogle`/`connectOutlook`
 * BEFORE the explainer/redirect (marked below) — kept as one seam on purpose.
 */
export function useConnectProvider({ onPendingActivation } = {}) {
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [connectingOutlook, setConnectingOutlook] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);

  // The actual hand-off to the provider. Shared by connect + reconnect.
  const redirect = useCallback(async (provider) => {
    const setBusy = provider === 'outlook' ? setConnectingOutlook : setConnectingGoogle;
    const getUrl = provider === 'outlook' ? getOutlookOAuthUrl : getGmailOAuthUrl;
    setBusy(true);
    try {
      const url = await getUrl();
      window.location.href = url;   // leave to the provider; it returns to the callback
    } catch (e) {
      setBusy(false);
      if ((e.message || '').includes('pending_activation')) {
        onPendingActivation?.();    // retained hook for the planned invite gate
      } else {
        toast.error(e.message || 'Could not start the connection. Please try again.');
      }
    }
  }, [onPendingActivation]);

  // Gmail: explainer FIRST. [FUTURE GATE] invite-code check goes here, before it.
  const connectGoogle = useCallback(() => setExplainerOpen(true), []);
  // Outlook: no explainer. [FUTURE GATE] invite-code check goes here too.
  const connectOutlook = useCallback(() => redirect('outlook'), [redirect]);
  // Reconnect: skip the explainer — already consented once.
  const reconnect = useCallback(
    (acc) => redirect(acc?.provider === 'outlook' ? 'outlook' : 'gmail'),
    [redirect],
  );

  const confirmExplainer = useCallback(() => { setExplainerOpen(false); redirect('gmail'); }, [redirect]);
  const cancelExplainer = useCallback(() => setExplainerOpen(false), []);

  const explainer = (
    <ConnectExplainerModal
      open={explainerOpen}
      busy={connectingGoogle}
      onConfirm={confirmExplainer}
      onCancel={cancelExplainer}
    />
  );

  return {
    connectingGoogle,
    connectingOutlook,
    connectGoogle,
    connectOutlook,
    reconnect,
    explainer,
  };
}
