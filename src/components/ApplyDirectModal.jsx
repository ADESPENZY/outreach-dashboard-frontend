import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { X, FileText, ArrowRight } from 'lucide-react';
import { ApplyDirLoader } from './ui/ApplyDirLoader';
import { generateTailoredCV } from '../services/apiOutreach';

// ── Apply Direct modal ────────────────────────────────────────────────────
// Shown when a user applies to a role we couldn't find a contact for. Offers a
// one-tap tailored CV before sending them off to the job posting. Either path
// runs onApplied() (tracking) and opens the job URL.

const ApplyDirectModal = ({ job, onClose, onApplied }) => {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  if (!job) return null;

  const openListing = () => {
    if (job.apply_url) {
      window.open(job.apply_url, '_blank', 'noopener,noreferrer');
    } else {
      toast.info('No application link is available for this role.');
    }
  };

  // The server names the file (outreach.views._safe_cv_filename) so every CV
  // download across the app uses one convention.
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const { blob, filename } = await generateTailoredCV(job.id);
      downloadBlob(blob, filename);
      toast.success('Your tailored CV is ready — opening the listing.');
      onApplied?.();
      openListing();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Could not generate your CV. Please try again.');
      setBusy(false); // keep the modal open so they can retry or just apply
    }
  };

  const handleJustApply = () => {
    onApplied?.();
    openListing();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !busy && onClose()}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-md bg-white rounded-2xl border border-neutral-dark shadow-2xl p-6 md:p-7 font-roboto"
          initial={{ opacity: 0, y: 28, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => !busy && onClose()}
            aria-label="Close"
            disabled={busy}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-secondary-dark/60 hover:text-black-light hover:bg-neutral transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-primary-light/10 flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-primary-light" />
          </div>

          <h2 className="text-lg font-bold font-montserrat text-black-light">
            Want a tailored CV for this role?
          </h2>
          <p className="mt-1.5 text-sm text-secondary-dark leading-relaxed">
            We&rsquo;ll rewrite your CV to highlight what matters most for
            {job.title ? <span className="font-medium text-black-light"> {job.title}</span> : ' this role'}
            {job.company_name ? <> at {job.company_name}</> : null}, then take you to the listing.
          </p>

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
            <button
              onClick={handleJustApply}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 bg-neutral hover:bg-neutral-dark text-black-light font-semibold rounded-xl px-5 py-2.5 transition-all disabled:opacity-60"
            >
              Just apply <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleGenerate}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy
                ? <><ApplyDirLoader.Button variant="light" /> Tailoring…</>
                : <>Generate CV</>}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ApplyDirectModal;
