/* ModernCVTemplate — faithful React/Tailwind rebuild of the legacy ReportLab two-column template */
export default function ModernCVTemplate({ cvData }) {
  const contact      = cvData.contact_info || {};
  const summary      = cvData.professional_summary || cvData.summary || '';
  const experience   = cvData.experience || [];
  const education    = cvData.education || '';
  const competencies = cvData.core_competencies || [];
  const skills       = cvData.skills || {};
  const projects     = cvData.projects || [];

  // Role subtitle shown under the name — pulled from the first experience entry
  const firstRole = experience[0]?.role || experience[0]?.title || '';

  // Truncate contact field values to 28 chars, matching the legacy 28-char limit
  const truncate = (val) => (val && val.length > 28 ? val.slice(0, 25) + '...' : val);

  const contactFields = [
    contact.location,
    contact.email,
    contact.phone,
    contact.linkedin,
  ].filter(Boolean);

  const hasSkills = competencies.length > 0 || Object.keys(skills).length > 0;

  return (
    <div className="border-t-[6px] border-[#FF5B2E] w-full font-sans overflow-hidden">
      <div className="grid grid-cols-[30%_70%] min-h-full">

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
        <div className="bg-[#0F172A] border-r border-[#FF5B2E] px-[14px] pt-5 pb-6">

          {/* Candidate name */}
          <p className="text-white font-bold text-[15px] text-center leading-snug tracking-wide">
            {contact.name || 'Your Name'}
          </p>

          {/* Role subtitle */}
          {firstRole && (
            <p className="text-[#FF8C69] text-[9px] text-center mt-0.5 mb-3 leading-tight">
              {firstRole}
            </p>
          )}

          {/* ── CONTACT ── */}
          <div className="border-t border-[#1E293B] my-2" />
          <p className="text-[#FF5B2E] text-[8px] font-bold tracking-[0.15em] uppercase mt-3 mb-2">
            Contact
          </p>
          {contactFields.map((val, i) => (
            <p key={i} className="text-[#94A3B8] text-[9px] leading-[18px] break-all">
              {truncate(val)}
            </p>
          ))}

          {/* ── SKILLS / COMPETENCIES ── */}
          {hasSkills && (
            <>
              <div className="border-t border-[#1E293B] my-3" />
              {competencies.length > 0 ? (
                <>
                  <p className="text-[#FF5B2E] text-[8px] font-bold tracking-[0.15em] uppercase mb-2">
                    Core Competencies
                  </p>
                  {competencies.map((kw, i) => (
                    <p key={i} className="text-white text-[9px] leading-[18px] pl-1">
                      {kw}
                    </p>
                  ))}
                </>
              ) : (
                <>
                  <p className="text-[#FF5B2E] text-[8px] font-bold tracking-[0.15em] uppercase mb-2">
                    Skills
                  </p>
                  {Object.entries(skills).map(([cat, items]) => (
                    <div key={cat} className="mb-2">
                      <p className="text-[#FF8C69] text-[9px] font-bold leading-[18px]">{cat}</p>
                      <p className="text-white text-[9px] leading-[18px] pl-1">{items}</p>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT MAIN PANEL ─────────────────────────────────────────── */}
        <div className="bg-white px-5 py-5 space-y-5">

          {/* PROFESSIONAL SUMMARY */}
          {summary && (
            <div>
              <p className="text-[#FF5B2E] text-[8.5px] font-bold tracking-[0.15em] uppercase mb-1">
                Professional Summary
              </p>
              <div className="border-t border-[#E2E8F0] mb-2" />
              <p className="text-[#1E293B] text-[11px] leading-relaxed">{summary}</p>
            </div>
          )}

          {/* WORK EXPERIENCE */}
          {experience.length > 0 && (
            <div>
              <p className="text-[#FF5B2E] text-[8.5px] font-bold tracking-[0.15em] uppercase mb-1">
                Work Experience
              </p>
              <div className="border-t border-[#E2E8F0] mb-2" />
              <div className="space-y-4">
                {experience.map((exp, i) => {
                  const role = exp.role || exp.title || '';
                  const meta = [exp.company, exp.location, exp.dates]
                    .filter(Boolean)
                    .join('  ·  ');
                  return (
                    <div key={i}>
                      <p className="text-[#1E293B] font-bold text-[11.5px] leading-snug">
                        {role}
                      </p>
                      {meta && (
                        <p className="text-[#64748B] text-[9.5px] leading-5 mb-1">{meta}</p>
                      )}
                      <div className="space-y-1 mt-1">
                        {exp.bullets?.map((bullet, j) => (
                          <p
                            key={j}
                            className="text-[#1E293B] text-[10.5px] leading-relaxed relative pl-3.5"
                          >
                            <span className="absolute left-0 select-none">•</span>
                            {bullet}
                          </p>
                        ))}
                      </div>
                      {exp.stack && (
                        <p className="text-[#64748B] text-[9.5px] italic pl-3.5 mt-1">
                          {exp.stack}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PROJECTS (present in legacy schema, gracefully absent in new) */}
          {projects.length > 0 && (
            <div>
              <p className="text-[#FF5B2E] text-[8.5px] font-bold tracking-[0.15em] uppercase mb-1">
                Projects
              </p>
              <div className="border-t border-[#E2E8F0] mb-2" />
              <div className="space-y-3">
                {projects.map((proj, i) => (
                  <div key={i}>
                    <p className="text-[#1E293B] font-bold text-[11px]">{proj.name}</p>
                    {proj.description && (
                      <p className="text-[#1E293B] text-[10.5px] leading-relaxed">
                        {proj.description}
                      </p>
                    )}
                    {proj.stack && (
                      <p className="text-[#64748B] text-[9.5px] italic pl-3.5">{proj.stack}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EDUCATION & DEVELOPMENT */}
          {education && (
            <div>
              <p className="text-[#FF5B2E] text-[8.5px] font-bold tracking-[0.15em] uppercase mb-1">
                Education &amp; Development
              </p>
              <div className="border-t border-[#E2E8F0] mb-2" />
              {Array.isArray(education) ? (
                education.map((edu, i) => (
                  <p key={i} className="text-[#1E293B] text-[11px] leading-relaxed">
                    {[edu.degree, edu.institution, edu.year].filter(Boolean).join('  ·  ')}
                  </p>
                ))
              ) : (
                <p className="text-[#1E293B] text-[11px] leading-relaxed">{education}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
