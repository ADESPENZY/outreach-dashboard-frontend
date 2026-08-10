import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, LayoutTemplate, AlignLeft, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { ApplyDirLoader } from './ui/ApplyDirLoader';
import { getCvTemplates, renderCvPdf } from '../services/apiOutreach';
import ModernCVTemplate from './ModernCVTemplate';
import ExecutiveCVTemplate from './ExecutiveCVTemplate';
import ResumeStylePrompt from './ResumeStylePrompt';

/*
  Tailored CV preview + style switcher.

  The content shown here is the ALREADY-GENERATED GeneratedResume JSON passed in
  as `data`. Switching styles re-renders that same content — on screen instantly,
  and on download through POST /api/outreach/cv/render/, which never calls
  OpenAI. Generation happens once, upstream; this is presentation only.

  RENDERED THROUGH A PORTAL, and it must stay that way. This component mounts
  inside GenerateCvButton, which lives inside JobDetailDrawer's <motion.aside>.
  Framer-motion keeps a `transform` on that element, and a transformed ancestor
  becomes the containing block for `position: fixed` descendants — so without the
  portal this overlay is positioned and clipped relative to the drawer, which
  pushed the whole top bar (style toggle + Download) off screen.

  ADDING A STYLE LATER is one line in CV_TEMPLATES plus its backend renderer.
  The backend is the source of truth for which styles exist (it returns the
  list); this map only supplies the on-screen React preview and icon for each.
*/
const CV_TEMPLATES = {
  modern:    { icon: LayoutTemplate, Preview: ModernCVTemplate },
  executive: { icon: AlignLeft,      Preview: ExecutiveCVTemplate },
};

// Used until the backend list arrives, so the switcher never renders empty.
const FALLBACK_TEMPLATES = [
  { id: 'modern',    label: 'Modern',    description: 'Two-column with branded sidebar' },
  { id: 'executive', label: 'Executive', description: 'ATS-strict single column' },
];

export default function TailoredCVPreview({ jobId, job, data, onClose }) {
  const [templates, setTemplates] = useState(FALLBACK_TEMPLATES);
  const [active, setActive] = useState('modern');
  const [downloading, setDownloading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCvTemplates()
      .then((res) => {
        if (cancelled) return;
        if (Array.isArray(res?.templates) && res.templates.length) setTemplates(res.templates);
        if (res?.default) setActive(res.default);
        if (!res?.has_chosen) setShowPrompt(true);
      })
      .catch(() => { /* keep the fallback list; the preview still works */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !showPrompt) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, showPrompt]);

  // The page behind must not scroll while the overlay is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await renderCvPdf(jobId, active);
      const safe = `${job?.company_name || 'role'}_${job?.title || 'CV'}`
        .replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80);
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = Object.assign(document.createElement('a'), { href: url });
      a.setAttribute('download', `${safe}_${active}_CV.pdf`);
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success('CV downloaded.');
    } catch (err) {
      toast.error(err?.message || 'PDF download failed.');
    } finally {
      setDownloading(false);
    }
  };

  const ActivePreview = CV_TEMPLATES[active]?.Preview || ModernCVTemplate;
  const activeLabel = templates.find((t) => t.id === active)?.label || active;

  const overlay = (
    <>
      {showPrompt && (
        <ResumeStylePrompt
          templates={templates}
          initial={active}
          onSaved={(choice) => { setActive(choice); setShowPrompt(false); }}
          onSkip={() => setShowPrompt(false)}
        />
      )}

      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

          {/* ── TITLE ROW ─────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-4 pb-3 flex-shrink-0">
            <div>
              <h2 className="font-montserrat font-bold text-black text-base leading-tight">
                Tailored CV Preview
              </h2>
              <p className="text-secondary-dark text-xs mt-0.5 font-roboto">
                Same content in every style — pick one, then download.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="p-1.5 rounded-lg text-secondary-dark hover:bg-neutral-dark hover:text-black transition-all shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── STYLE PICKER — its own full-width row so it can't be crowded ── */}
          <div className="px-5 sm:px-6 pb-4 flex-shrink-0 border-b border-neutral-dark">
            <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-secondary-dark mb-2">
              Choose a style · {templates.length} available
            </p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {templates.map(({ id, label, description }) => {
                const Icon = CV_TEMPLATES[id]?.icon || LayoutTemplate;
                const isActive = active === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActive(id)}
                    aria-pressed={isActive}
                    className={`
                      relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left
                      transition-all duration-150
                      ${isActive
                        ? 'border-primary-dark bg-primary-dark/5 shadow-sm'
                        : 'border-neutral-dark hover:border-secondary-dark/40 bg-white'}
                    `}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-primary-dark' : 'text-secondary-dark'}`} />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-black truncate">{label}</span>
                      <span className="block text-[11px] text-secondary-dark leading-snug">{description}</span>
                    </span>
                    {isActive && (
                      <Check className="w-3.5 h-3.5 text-primary-dark shrink-0 absolute top-2 right-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── PREVIEW CANVAS ────────────────────────────────────────── */}
          <div className="overflow-y-auto flex-1 bg-neutral-dark/10 min-h-0">
            <div className="max-w-[720px] mx-auto my-5 shadow-xl rounded overflow-hidden ring-1 ring-black/10">
              <ActivePreview cvData={data} />
            </div>
          </div>

          {/* ── ACTION BAR — always visible, never scrolls away ────────── */}
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 border-t border-neutral-dark bg-neutral flex-shrink-0">
            <p className="text-xs text-secondary-dark truncate">
              Downloading <span className="font-semibold text-black">{activeLabel}</span>
            </p>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-dark to-primary-light text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 shrink-0"
            >
              {downloading
                ? <ApplyDirLoader.Button variant="light" />
                : <Download className="w-4 h-4" />}
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // Portal to <body> — see the note at the top of this file.
  return createPortal(overlay, document.body);
}
