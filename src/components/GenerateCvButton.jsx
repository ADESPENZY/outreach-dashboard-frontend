import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FileText, Check, Loader2, Eye } from 'lucide-react';
import { generateJobCV } from '../services/apiOutreach';
import TailoredCVPreview from './TailoredCVPreview';

// ── Generate / preview a role-tailored CV ─────────────────────────────────
// Subtle text button used on every Opportunities card and next to every drafted
// introduction. Deliberately quiet — never competes with the primary
// Write Intro / Skip / Approve actions.
//
// BEHAVIOUR CHANGE: this used to stream a PDF straight to disk. It now opens the
// preview, where the user can switch style and download. The generation step is
// unchanged and still cached: generateJobCV() returns the stored
// GeneratedResume.content when one exists and only calls OpenAI on the very
// first request for a job. Switching style afterwards costs nothing.

const GenerateCvButton = ({ job, hasCv = false, className = '' }) => {
  const [done, setDone] = useState(!!hasCv);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const handleClick = async () => {
    if (busy || !job?.id) return;
    setBusy(true);
    try {
      // Ensures the tailored CONTENT exists before the preview asks the server
      // to render it — /cv/render/ 404s rather than generating. Cached after the
      // first call, so this is the only step that can ever hit OpenAI.
      await generateJobCV(job.id);
      setOpen(true);
      if (!done) toast.success('CV tailored to this role.');
      setDone(true);
    } catch (err) {
      toast.error(err?.message || 'Could not generate your CV. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const base =
    'inline-flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-label={done ? 'Preview tailored CV' : 'Generate a CV tailored to this role'}
        className={`${base} ${done ? 'text-emerald-600 hover:text-emerald-700' : 'text-secondary-dark hover:text-primary-dark'} ${className}`}
      >
        {busy ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Tailoring…</>
        ) : done ? (
          <><Check className="w-3.5 h-3.5" /> CV tailored <span className="text-secondary-dark/50">·</span> <Eye className="w-3.5 h-3.5" /> Preview</>
        ) : (
          <><FileText className="w-3.5 h-3.5" /> Generate CV</>
        )}
      </button>

      {open && (
        <TailoredCVPreview jobId={job.id} onClose={() => setOpen(false)} />
      )}
    </>
  );
};

export default GenerateCvButton;
