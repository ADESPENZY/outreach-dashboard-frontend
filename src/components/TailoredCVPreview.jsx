import { useState } from 'react';
import {
  X, Download, Loader2, Mail, Phone, MapPin, Linkedin,
  Briefcase, GraduationCap, Zap, ChevronRight,
} from 'lucide-react';
import { getJobCV } from '../services/apiOutreach';
import { toast } from 'react-toastify';

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-[10px] font-montserrat font-bold tracking-[0.15em] uppercase text-primary-light">
          {title}
        </h3>
        <div className="flex-1 h-px bg-gradient-to-r from-primary-light/30 to-transparent" />
      </div>
      {children}
    </div>
  );
}

export default function TailoredCVPreview({ jobId, data, onClose }) {
  const [downloading, setDownloading] = useState(false);

  const contact      = data.contact_info || {};
  const summary      = data.professional_summary || data.summary || '';
  const competencies = data.core_competencies || [];
  const experience   = data.experience || [];
  const education    = data.education || '';

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
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-dark bg-neutral flex-shrink-0">
          <div>
            <h2 className="font-montserrat font-bold text-black text-base leading-tight">
              Tailored CV Preview
            </h2>
            <p className="text-secondary-dark text-xs mt-0.5 font-roboto">
              AI-rewritten using the Google XYZ formula
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

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-6 font-roboto">

          {/* Contact header */}
          {(contact.name || contact.email) && (
            <div className="mb-6 pb-5 border-b border-neutral-dark">
              {contact.name && (
                <h1 className="font-montserrat font-extrabold text-2xl text-black leading-tight mb-1">
                  {contact.name}
                </h1>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {contact.email && (
                  <span className="flex items-center gap-1 text-xs text-secondary-dark">
                    <Mail className="w-3 h-3 text-primary-light" />
                    {contact.email}
                  </span>
                )}
                {contact.phone && (
                  <span className="flex items-center gap-1 text-xs text-secondary-dark">
                    <Phone className="w-3 h-3 text-primary-light" />
                    {contact.phone}
                  </span>
                )}
                {contact.location && (
                  <span className="flex items-center gap-1 text-xs text-secondary-dark">
                    <MapPin className="w-3 h-3 text-primary-light" />
                    {contact.location}
                  </span>
                )}
                {contact.linkedin && (
                  <span className="flex items-center gap-1 text-xs text-secondary-dark">
                    <Linkedin className="w-3 h-3 text-primary-light" />
                    {contact.linkedin}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Professional Summary */}
          {summary && (
            <Section title="Professional Summary">
              <p className="text-sm text-black-light leading-relaxed">{summary}</p>
            </Section>
          )}

          {/* Core Competencies */}
          {competencies.length > 0 && (
            <Section title="Core Competencies">
              <div className="flex flex-wrap gap-2">
                {competencies.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary-light/10 text-primary-dark border border-primary-light/20"
                  >
                    <Zap className="w-2.5 h-2.5" />
                    {kw}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Experience */}
          {experience.length > 0 && (
            <Section title="Work Experience">
              <div className="space-y-5">
                {experience.map((exp, i) => {
                  const role = exp.role || exp.title || '';
                  return (
                    <div key={i} className="relative pl-4 border-l-2 border-primary-light/30">
                      <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-primary-light" />
                      <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                        <div>
                          <p className="font-semibold text-sm text-black leading-tight">{role}</p>
                          <p className="text-xs text-primary-dark font-medium flex items-center gap-1 mt-0.5">
                            <Briefcase className="w-3 h-3" />
                            {exp.company}
                          </p>
                        </div>
                        {exp.dates && (
                          <span className="text-[10px] text-secondary-dark bg-neutral px-2 py-0.5 rounded-full border border-neutral-dark flex-shrink-0">
                            {exp.dates}
                          </span>
                        )}
                      </div>
                      {exp.bullets?.length > 0 && (
                        <ul className="mt-2 space-y-1.5">
                          {exp.bullets.map((bullet, j) => (
                            <li key={j} className="flex items-start gap-1.5 text-xs text-black-light leading-relaxed">
                              <ChevronRight className="w-3 h-3 text-primary-light flex-shrink-0 mt-0.5" />
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Education */}
          {education && (
            <Section title="Education">
              {Array.isArray(education) ? (
                <div className="space-y-2">
                  {education.map((edu, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <GraduationCap className="w-4 h-4 text-primary-light flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-black leading-tight">{edu.degree}</p>
                        <p className="text-xs text-secondary-dark">{edu.institution}{edu.year ? ` · ${edu.year}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <GraduationCap className="w-4 h-4 text-primary-light flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-black-light leading-relaxed">{education}</p>
                </div>
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
