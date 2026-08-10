import { useEffect, useState } from 'react';
import { X, Download, LayoutTemplate, AlignLeft } from 'lucide-react';
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

  ADDING A STYLE LATER is one line in CV_TEMPLATES plus its backend renderer.
  The backend is the source of truth for which styles exist (it returns the
  list); this map only supplies the on-screen React preview and icon for each.
*/
const CV_TEMPLATES = {
  modern:    { icon: LayoutTemplate, Preview: ModernCVTemplate },
  executive: { icon: AlignLeft,      Preview: ExecutiveCVTemplate },
};

// Used until the backend list arrives, so the toggle never renders empty.
const FALLBACK_TEMPLATES = [
  { id: 'modern',    label: 'Modern',    description: 'Two-column with branded sidebar' },
  { id: 'executive', label: 'Executive', description: 'ATS-strict single column' },
];

export default function TailoredCVPreview({ jobId, job, data, onClose }) {
  const [templates, setTemplates] = useState(FALLBACK_TEMPLATES);
  const [active, setActive] = useState('modern');
  const [downloading, setDownloading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Fetch the pickable styles + this user's default. If they have never chosen,
  // show the one-time prompt over the preview.
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

  return (
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
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden">

          {/* ── TOP BAR — title · style toggle · download · close ── */}
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-neutral-dark bg-neutral flex-shrink-0">
            <div className="shrink-0">
              <h2 className="font-montserrat font-bold text-black text-base leading-tight">
                Tailored CV Preview
              </h2>
              <p className="text-secondary-dark text-xs mt-0.5 font-roboto">
                Same content, switch the style freely
              </p>
            </div>

            <div className="flex items-center rounded-xl border-2 border-neutral-dark bg-white p-1 gap-1 shadow-sm">
              {templates.map(({ id, label }) => {
                const Icon = CV_TEMPLATES[id]?.icon || LayoutTemplate;
                const isActive = active === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActive(id)}
                    aria-pressed={isActive}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold
                      transition-all duration-150 select-none
                      ${isActive
                        ? 'bg-black text-white shadow'
                        : 'text-secondary-dark hover:bg-neutral-dark hover:text-black'}
                    `}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary-dark to-primary-light text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {downloading
                  ? <ApplyDirLoader.Button variant="light" />
                  : <Download className="w-3.5 h-3.5" />}
                Download PDF
              </button>
              <button
                onClick={onClose}
                aria-label="Close preview"
                className="p-1.5 rounded-lg text-secondary-dark hover:bg-neutral-dark hover:text-black transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── PREVIEW CANVAS ── */}
          <div className="overflow-y-auto flex-1 bg-neutral-dark/10">
            <div className="max-w-[720px] mx-auto my-6 shadow-xl rounded overflow-hidden ring-1 ring-black/10">
              <ActivePreview cvData={data} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
