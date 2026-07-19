import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Mail, X, Loader2 } from 'lucide-react';
import { getGmailOAuthUrl } from '../services/apiGmail';
import { getProfile } from '../services/apiProfile';
import PendingActivationCard from './PendingActivationCard';

/**
 * NoInboxModal — shown when the user tries to send without a connected Gmail.
 *
 * OAuth-only: the single path is "Connect with Google" (one click, no
 * passwords — we can only send what the user approves and read replies to
 * those introductions). If the account hasn't been personally activated for
 * the pilot yet, the white-glove PendingActivationCard shows instead of the
 * button — never a dead end, never a raw error.
 */
function NoInboxModal({ onClose }) {
  const [connecting, setConnecting] = useState(false);
  const [pendingGate, setPendingGate] = useState(false);

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const isPending = pendingGate || (profile && profile.activation_status !== 'activated');

  const handleGoogleConnect = async () => {
    setConnecting(true);
    try {
      const url = await getGmailOAuthUrl();
      window.location.href = url; // off to Google; callback returns to Settings
    } catch (e) {
      setConnecting(false);
      if ((e.message || '').includes('pending_activation')) {
        setPendingGate(true); // flip to the white-glove state, no error toast
      } else {
        toast.error(e.message || 'Could not start the connection. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-neutral-dark relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-secondary-dark/50 hover:bg-neutral-dark rounded-full p-1.5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {isPending ? (
          <div className="pt-2">
            <PendingActivationCard compact />
            <button
              onClick={onClose}
              className="mt-4 w-full py-2.5 text-sm font-semibold text-secondary-dark bg-white border border-neutral-dark rounded-xl hover:bg-neutral transition-colors"
            >
              Got it
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-7">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center mb-5 shadow-lg shadow-primary-light/30">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-black font-montserrat leading-snug">
                Connect your Gmail first
              </h2>
              <p className="text-sm text-secondary-dark mt-3 leading-relaxed max-w-xs mx-auto">
                Introductions send from your own Gmail — that&rsquo;s why hiring
                managers reply. One click with Google, no passwords to paste.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleGoogleConnect}
                disabled={connecting}
                className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-gradient-to-r from-primary-light to-primary-dark hover:opacity-90 text-white font-bold font-montserrat rounded-xl shadow-md shadow-primary-light/30 transition-all active:scale-95 disabled:opacity-60"
              >
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Connect with Google
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 text-sm font-semibold text-secondary-dark bg-white border border-neutral-dark rounded-xl hover:bg-neutral transition-colors"
              >
                Maybe Later
              </button>
              <p className="text-[11px] text-secondary-dark/70 text-center leading-relaxed">
                We can only send introductions you approve and read the replies
                to them — nothing else in your inbox.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default NoInboxModal;
