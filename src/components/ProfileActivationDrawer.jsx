import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, FileText, Loader2, Brain } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { updateProfile } from '../services/apiProfile';
import { updateAutoScoutSettings } from '../services/apiSettings';

export default function ProfileActivationDrawer({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [cvText, setCvText] = useState('');
  const [scoringRules, setScoringRules] = useState('');

  const activateMutation = useMutation({
    mutationFn: async () => {
      const calls = [updateProfile({ cv_raw_text: cvText.trim() })];
      if (scoringRules.trim()) {
        calls.push(updateAutoScoutSettings({ custom_scoring_prompt: scoringRules.trim() }));
      }
      return Promise.all(calls);
    },
    onSuccess: () => {
      toast.success('AI Engine activated! Scores are being computed for your jobs.');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['jobs-stream'] });
      queryClient.invalidateQueries({ queryKey: ['auto-scout-settings'] });
      onClose();
    },
    onError: (err) => toast.error(err.message || 'Activation failed. Please try again.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!cvText.trim()) {
      toast.error('Please paste your resume text to activate AI scoring.');
      return;
    }
    activateMutation.mutate();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="pad-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            key="pad-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-[90] w-full max-w-md bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-neutral-dark flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center shadow-md shadow-orange-200 shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-black font-montserrat text-base leading-tight">
                    Activate AI Engine
                  </h2>
                  <p className="text-xs text-secondary-dark mt-0.5">
                    Unlock scoring &amp; tailored CV generation
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-secondary-dark hover:bg-neutral-dark rounded-lg transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

              {/* CV Text section */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText className="w-4 h-4 text-primary-light shrink-0" />
                  <label className="text-sm font-semibold text-black">Resume / CV Text</label>
                  <span className="ml-auto text-[10px] font-semibold text-primary-dark bg-primary-light/10 border border-primary-light/20 px-2 py-0.5 rounded-full">
                    Required
                  </span>
                </div>
                <p className="text-xs text-secondary-dark mb-2.5 leading-relaxed">
                  Paste your full resume text. The AI uses this to compute match scores and generate
                  a tailored CV for each approved job.
                </p>
                <textarea
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  placeholder={"Paste your resume text here…\n\nJohn Doe\nSenior Software Engineer\n5 years of experience in Django, React, PostgreSQL…"}
                  rows={10}
                  className="w-full p-3 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-primary-light/30 focus:border-primary-light outline-none resize-none transition-all text-black placeholder:text-secondary-dark/50 font-roboto leading-relaxed"
                />
              </div>

              {/* Scoring rules section */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Brain className="w-4 h-4 text-accent-teal shrink-0" />
                  <label className="text-sm font-semibold text-black">Custom AI Scoring Rules</label>
                  <span className="ml-auto text-[10px] font-semibold text-secondary-dark bg-neutral-dark border border-neutral-dark px-2 py-0.5 rounded-full">
                    Optional
                  </span>
                </div>
                <p className="text-xs text-secondary-dark mb-2.5 leading-relaxed">
                  Tell the AI what makes a role a strong fit — seniority, tech stack, remote
                  preference, salary range, company size, etc.
                </p>
                <textarea
                  value={scoringRules}
                  onChange={(e) => setScoringRules(e.target.value)}
                  placeholder={"e.g. Prioritise remote-first roles. Prefer companies with < 200 employees. Must use Python or Django. Weight salary above £60k highly."}
                  rows={5}
                  className="w-full p-3 bg-neutral border border-neutral-dark rounded-xl text-sm focus:ring-2 focus:ring-accent-teal/30 focus:border-accent-teal outline-none resize-none transition-all text-black placeholder:text-secondary-dark/50 font-roboto leading-relaxed"
                />
              </div>

              {/* Spacer so content doesn't hide behind sticky footer */}
              <div className="h-2" />
            </form>

            {/* Sticky footer */}
            <div className="px-6 py-4 border-t border-neutral-dark shrink-0 bg-white">
              <button
                onClick={handleSubmit}
                disabled={activateMutation.isPending || !cvText.trim()}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white py-3 rounded-xl font-semibold text-sm shadow-md shadow-orange-200 hover:opacity-90 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {activateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Activating…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Activate AI Engine</>
                )}
              </button>
              <p className="text-xs text-secondary-dark/50 text-center mt-3">
                Your CV text is stored securely and used only for job matching &amp; tailoring.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
