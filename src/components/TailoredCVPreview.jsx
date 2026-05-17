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

        {/* ── TOP HEADER BAR — title · template toggle · download · close ── */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-neutral-dark bg-neutral flex-shrink-0">

          {/* Left: title */}
          <div className="shrink-0">
            <h2 className="font-montserrat font-bold text-black text-base leading-tight">
              Tailored CV Preview
            </h2>
            <p className="text-secondary-dark text-xs mt-0.5 font-roboto">
              AI-rewritten · Google XYZ bullets
            </p>
          </div>

          {/* Centre: template segmented control */}
          <div className="flex items-center rounded-xl border-2 border-neutral-dark bg-white p-1 gap-1 shadow-sm">
            {TEMPLATES.map(({ key, label, icon: Icon }) => {
              const active = activeTemplate === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTemplate(key)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold
                    transition-all duration-150 select-none
                    ${active
                      ? 'bg-black text-white shadow'
                      : 'text-secondary-dark hover:bg-neutral-dark hover:text-black'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Right: download + close */}
          <div className="flex items-center gap-2 shrink-0">
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

        {/* ── TEMPLATE CANVAS ────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 bg-neutral-dark/10">
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
