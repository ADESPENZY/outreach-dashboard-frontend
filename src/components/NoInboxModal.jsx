import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Mail, X } from 'lucide-react';
import OnboardingModal from './OnboardingModal';
import { createGmailAccount } from '../services/apiGmail';

function NoInboxModal({ onClose }) {
  const queryClient = useQueryClient();
  const [showConnect, setShowConnect] = useState(false);

  const handleConnect = async (formData) => {
    try {
      await createGmailAccount(formData);
      queryClient.invalidateQueries({ queryKey: ['gmail-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['gmailAccounts'] });
      toast.success('Email connected! You can now schedule and send.');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to connect Gmail');
    }
  };

  if (showConnect) {
    return (
      <OnboardingModal
        onClose={() => setShowConnect(false)}
        onComplete={handleConnect}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-neutral-dark relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-secondary-dark/50 hover:bg-neutral-dark rounded-full p-1.5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-7">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center mb-5 shadow-lg shadow-primary-light/30">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-black font-montserrat leading-snug">
            Connect Your Email First
          </h2>
          <p className="text-sm text-secondary-dark mt-3 leading-relaxed max-w-xs mx-auto">
            You need to connect a Gmail account before we can send anything. It takes less than a minute.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => setShowConnect(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-gradient-to-r from-primary-light to-primary-dark hover:opacity-90 text-white font-bold font-montserrat rounded-xl shadow-md shadow-primary-light/30 transition-all active:scale-95"
          >
            <Mail className="w-4 h-4" />
            Connect Gmail Now
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold text-secondary-dark bg-white border border-neutral-dark rounded-xl hover:bg-neutral transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}

export default NoInboxModal;
