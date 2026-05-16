import { useState } from 'react';
import { X, Download, Loader2, LayoutTemplate, AlignLeft } from 'lucide-react';
import { getJobCV } from '../services/apiOutreach';
import { toast } from 'react-toastify';
import ModernCVTemplate from './ModernCVTemplate';
import ExecutiveCVTemplate from './ExecutiveCVTemplate';

const TEMPLATES = [
  {
    key: 'modern',
    label: 'Modern Layout',
    icon: LayoutTemplate,
    description: 'Two-column with branded sidebar',
  },
  {
    key: 'executive',
    label: 'Executive Layout',
    icon: AlignLeft,
    description: 'ATS-strict single column',
  },
];

export default function TailoredCVPreview({ jobId, data, onClose }) {
  const [activeTemplate, setActiveTemplate] = useState('modern');
  const [downloading, setDownloading]       = useState(false);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await getJobCV(jobId);
      const url  = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a    = Object.assign(document.createElement('a'), { href: url });
      a.setAttribute('download', `tailored_cv_${jobId}.pdf`);
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch (err) {
      toast.error('PDF download failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden">

        {/* ── TOP HEADER BAR ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-dark bg-neutral flex-shrink-0">
          <div>
            <h2 className="font-montserrat font-bold text-black text-base leading-tight">
              Tailored CV Preview
            </h2>
            <p className="text-secondary-dark text-xs mt-0.5 font-roboto">
              AI-rewritten · Google XYZ formula · select a layout below
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary-dark to-primary-light text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {downloading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Download className="w-3.5 h-3.5" />
              }
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-secondary-dark hover:bg-neutral-dark hover:text-black transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── TEMPLATE TOGGLE ────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-6 py-3 border-b border-neutral-dark bg-white">
          <div className="inline-flex rounded-xl border border-neutral-dark bg-neutral p-1 gap-1">
            {TEMPLATES.map(({ key, label, icon: Icon, description }) => {
              const active = activeTemplate === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTemplate(key)}
                  className={`
                    relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold
                    transition-all duration-200
                    ${active
                      ? 'bg-white text-black shadow-sm border border-neutral-dark'
                      : 'text-secondary-dark hover:text-black'
                    }
                  `}
                >
                  {/* Active indicator dot */}
                  {active && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary-light" />
                  )}
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-primary-light' : ''}`} />
                  <span className="font-montserrat">{label}</span>
                  <span className={`hidden sm:inline text-[9px] font-normal font-roboto ${active ? 'text-secondary-dark' : 'text-secondary-dark/60'}`}>
                    — {description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TEMPLATE CANVAS ────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 bg-neutral-dark/10">
          {/* Paper shadow wrapper to mimic a document preview */}
          <div className="max-w-[720px] mx-auto my-6 shadow-xl rounded overflow-hidden ring-1 ring-black/10">
            {activeTemplate === 'modern'
              ? <ModernCVTemplate cvData={data} />
              : <ExecutiveCVTemplate cvData={data} />
            }
          </div>
        </div>
      </div>
    </div>
  );
}
