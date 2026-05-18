import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Mail, X } from 'lucide-react';

function NoInboxModal({ onClose }) {
  const navigate = useNavigate();

  const handleConnect = () => {
    onClose();
    navigate('/dashboard/inboxes');
  };

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
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-5 shadow-lg shadow-orange-200">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-black font-montserrat leading-snug">
            Hold Up! Connect Your Inbox First.
          </h2>
          <p className="text-sm text-secondary-dark mt-3 leading-relaxed max-w-xs mx-auto">
            You cannot automate outreach without a sender address. Please connect your Google Workspace or Gmail account to continue.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleConnect}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-md shadow-orange-200 transition-all active:scale-95"
          >
            <Mail className="w-4 h-4" />
            Connect Email Now
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
