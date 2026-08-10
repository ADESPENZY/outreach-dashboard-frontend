/* SignatureCVTemplate — on-screen mirror of outreach/templates/outreach/cv_signature.html

   Executive's structure with a restrained brand accent: Montserrat headings, a
   thin orange rule under each, and one short orange mark under the name.
   Kept visually in step with the Django template that actually produces the PDF —
   if you change one, change the other. */
export default function SignatureCVTemplate({ cvData }) {
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

  const Heading = ({ children }) => (
    <h2 className="font-montserrat font-semibold text-[10px] uppercase tracking-[0.14em] text-[#111827] border-b border-[#FF5B2E] pb-[3px] mb-2">
      {children}
    </h2>
  );

  return (
    <div className="font-sans w-full bg-white text-[#111827] px-10 py-8">

      {/* ── HEADER — name, one accent mark, contact ── */}
      <div className="mb-5">
        <h1 className="font-montserrat font-bold text-[20px] leading-tight tracking-[0.04em]">
          {contact.name || 'Your Name'}
        </h1>
        <div className="w-[100px] h-[3px] bg-[#FF5B2E] mt-1.5 mb-2" />
        {contactFields.length > 0 && (
          <p className="text-[10px] leading-relaxed text-[#4B5563]">
            {contactFields.join('  ·  ')}
          </p>
        )}
      </div>

      {summary && (
        <div className="mb-5">
          <Heading>Profile</Heading>
          <p className="text-[11px] leading-relaxed">{summary}</p>
        </div>
      )}

      {competencies.length > 0 && (
        <div className="mb-5">
          <Heading>Core Competencies</Heading>
          <p className="text-[11px] leading-relaxed">{competencies.join(', ')}</p>
        </div>
      )}

      {experience.length > 0 && (
        <div className="mb-5">
          <Heading>Experience</Heading>
          <div className="space-y-3.5">
            {experience.map((exp, i) => {
              const role = exp.role || exp.title || '';
              return (
                <div key={i}>
                  <div className="flex justify-between items-baseline gap-4">
                    <p className="font-medium text-[11px] leading-snug">
                      {role}{exp.company ? `, ${exp.company}` : ''}
                    </p>
                    {exp.dates && (
                      <span className="text-[10.5px] text-[#4B5563] flex-shrink-0">{exp.dates}</span>
                    )}
                  </div>
                  {exp.bullets?.length > 0 && (
                    <ul className="mt-1 list-disc list-outside pl-4">
                      {exp.bullets.map((b, j) => (
                        <li key={j} className="text-[11px] leading-relaxed mb-0.5">{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {education && (
        <div className="mb-5">
          <Heading>Education</Heading>
          {Array.isArray(education) ? (
            <div className="space-y-1">
              {education.map((edu, i) => (
                <div key={i} className="flex justify-between items-baseline gap-4">
                  <p className="text-[11px] font-medium leading-relaxed">
                    {edu.degree}{edu.institution ? `, ${edu.institution}` : ''}
                  </p>
                  {edu.year && (
                    <span className="text-[10.5px] text-[#4B5563] flex-shrink-0">{edu.year}</span>
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
