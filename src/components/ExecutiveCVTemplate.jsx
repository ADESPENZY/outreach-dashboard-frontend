/* ExecutiveCVTemplate — ATS-strict single-column, serif, pure black & white */
export default function ExecutiveCVTemplate({ cvData }) {
  const contact      = cvData.contact_info || {};
  const summary      = cvData.professional_summary || cvData.summary || '';
  const experience   = cvData.experience || [];
  const education    = cvData.education || '';
  const competencies = cvData.core_competencies || [];

  const contactFields = [
    contact.email,
    contact.phone,
    contact.location,
    contact.linkedin,
  ].filter(Boolean);

  return (
    <div className="font-serif w-full bg-white text-black px-10 py-8">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="text-center border-b-2 border-black pb-4 mb-5">
        <h1 className="text-[18px] font-bold uppercase tracking-[0.2em] leading-snug">
          {contact.name || 'Your Name'}
        </h1>
        {contactFields.length > 0 && (
          <p className="text-[10px] mt-2 tracking-wide text-black leading-relaxed">
            {contactFields.join('  |  ')}
          </p>
        )}
      </div>

      {/* ── PROFESSIONAL SUMMARY ───────────────────────────────────────── */}
      {summary && (
        <div className="mb-5">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] border-b border-black pb-0.5 mb-2">
            Professional Summary
          </h2>
          <p className="text-[11px] leading-relaxed">{summary}</p>
        </div>
      )}

      {/* ── CORE COMPETENCIES ─────────────────────────────────────────── */}
      {competencies.length > 0 && (
        <div className="mb-5">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] border-b border-black pb-0.5 mb-2">
            Core Competencies
          </h2>
          <p className="text-[11px] leading-relaxed">
            {competencies.join(', ')}
          </p>
        </div>
      )}

      {/* ── PROFESSIONAL EXPERIENCE ───────────────────────────────────── */}
      {experience.length > 0 && (
        <div className="mb-5">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] border-b border-black pb-0.5 mb-2">
            Professional Experience
          </h2>
          <div className="space-y-4">
            {experience.map((exp, i) => {
              const role = exp.role || exp.title || '';
              return (
                <div key={i}>
                  <div className="flex justify-between items-baseline gap-4">
                    <p className="font-bold text-[11px] leading-snug">
                      {role}
                      {exp.company ? `, ${exp.company}` : ''}
                    </p>
                    {exp.dates && (
                      <span className="text-[11px] flex-shrink-0">{exp.dates}</span>
                    )}
                  </div>
                  {exp.bullets?.length > 0 && (
                    <ul className="mt-1 space-y-1 list-disc list-outside pl-4">
                      {exp.bullets.map((bullet, j) => (
                        <li key={j} className="text-[11px] leading-relaxed">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── EDUCATION ─────────────────────────────────────────────────── */}
      {education && (
        <div className="mb-5">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] border-b border-black pb-0.5 mb-2">
            Education
          </h2>
          {Array.isArray(education) ? (
            <div className="space-y-1">
              {education.map((edu, i) => (
                <div key={i} className="flex justify-between items-baseline gap-4">
                  <p className="text-[11px] font-bold leading-relaxed">
                    {edu.degree}
                    {edu.institution ? `, ${edu.institution}` : ''}
                  </p>
                  {edu.year && (
                    <span className="text-[11px] flex-shrink-0">{edu.year}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] leading-relaxed">{education}</p>
          )}
        </div>
      )}
    </div>
  );
}
