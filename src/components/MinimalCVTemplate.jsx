/* MinimalCVTemplate — on-screen mirror of outreach/templates/outreach/cv_minimal.html

   Deliberately plain: single column, no colour, no rules, no tracked uppercase.
   Kept visually in step with the Django template that actually produces the PDF —
   if you change one, change the other. */
export default function MinimalCVTemplate({ cvData }) {
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
    <h2 className="text-[11px] font-medium uppercase mt-4 mb-1.5">{children}</h2>
  );

  return (
    <div className="font-sans w-full bg-white text-black px-10 py-8 text-[11px] leading-relaxed">

      <p className="text-[16px] font-medium leading-tight">{contact.name || 'Your Name'}</p>
      {contactFields.length > 0 && (
        <p className="text-[10.5px] leading-snug">{contactFields.join(' | ')}</p>
      )}

      {summary && (
        <>
          <Heading>Professional Summary</Heading>
          <p>{summary}</p>
        </>
      )}

      {competencies.length > 0 && (
        <>
          <Heading>Skills</Heading>
          <p>{competencies.join(', ')}</p>
        </>
      )}

      {experience.length > 0 && (
        <>
          <Heading>Professional Experience</Heading>
          {experience.map((exp, i) => {
            const role = exp.role || exp.title || '';
            const meta = [exp.company, exp.dates].filter(Boolean).join(' | ');
            return (
              <div key={i} className={i > 0 ? 'mt-3' : ''}>
                <p className="font-medium">{role}</p>
                {meta && <p>{meta}</p>}
                {exp.bullets?.length > 0 && (
                  <ul className="list-disc list-outside pl-4 mt-0.5">
                    {exp.bullets.map((b, j) => <li key={j} className="mb-0.5">{b}</li>)}
                  </ul>
                )}
              </div>
            );
          })}
        </>
      )}

      {education && (
        <>
          <Heading>Education</Heading>
          {Array.isArray(education) ? (
            education.map((edu, i) => {
              const meta = [edu.institution, edu.year].filter(Boolean).join(' | ');
              return (
                <div key={i} className={i > 0 ? 'mt-3' : ''}>
                  <p className="font-medium">{edu.degree}</p>
                  {meta && <p>{meta}</p>}
                </div>
              );
            })
          ) : (
            <p>{education}</p>
          )}
        </>
      )}
    </div>
  );
}
