import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FileText, Check, Loader2, Download } from 'lucide-react';
import { generateTailoredCV } from '../services/apiOutreach';

// ── Generate / download a role-tailored CV ────────────────────────────────
// Subtle text button used on every Opportunities card and next to every drafted
// introduction. First tap generates (or reuses) a CV tailored to THIS job and
// downloads the PDF; afterwards it shows "CV tailored ✓ · Download" and
// re-downloads the cached one instantly. Deliberately quiet — never competes
// with the primary Write Intro / Skip / Approve actions.

function downloadCvBlob(blob, job) {
  const safe = `${job.company_name || 'role'}_${job.title || 'CV'}`
    .replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe}_CV.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const GenerateCvButton = ({ job, hasCv = false, className = '' }) => {
  const [done, setDone] = useState(!!hasCv);
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy || !job?.id) return;
    setBusy(true);
    try {
      const blob = await generateTailoredCV(job.id);
      downloadCvBlob(blob, job);
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
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={done ? 'Download tailored CV' : 'Generate a CV tailored to this role'}
      className={`${base} ${done ? 'text-emerald-600 hover:text-emerald-700' : 'text-secondary-dark hover:text-primary-dark'} ${className}`}
    >
      {busy ? (
        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Tailoring…</>
      ) : done ? (
        <><Check className="w-3.5 h-3.5" /> CV tailored <span className="text-secondary-dark/50">·</span> <Download className="w-3.5 h-3.5" /> Download</>
      ) : (
        <><FileText className="w-3.5 h-3.5" /> Generate CV</>
      )}
    </button>
  );
};

export default GenerateCvButton;
