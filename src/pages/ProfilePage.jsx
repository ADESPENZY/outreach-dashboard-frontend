import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, MapPin, Phone, Linkedin, Github, Globe,
  FileText, Pencil, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { getProfile } from '../services/apiBlog';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [cvExpanded, setCvExpanded] = useState(false);

  useEffect(() => {
    getProfile()
      .then(p => setProfile(p))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-light animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500 text-sm">No profile found.</p>
        <button
          onClick={() => navigate('/onboarding')}
          className="px-5 py-2.5 bg-gradient-to-r from-primary-dark to-primary-light text-white text-sm font-semibold rounded-xl"
        >
          Complete Setup
        </button>
      </div>
    );
  }

  const skills    = profile.skills_extracted?.skills          || [];
  const strongest = profile.skills_extracted?.strongest_areas || [];
  const fitTitles = profile.skills_extracted?.job_titles_fit  || [];
  const prefs     = profile.job_preferences  || {};

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-light/20 to-primary-dark/20 flex items-center justify-center shrink-0">
            <User className="w-7 h-7 text-primary-dark" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 font-montserrat">{profile.full_name || 'Your Name'}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
              {profile.location && (
                <InfoChip icon={MapPin}>{profile.location}</InfoChip>
              )}
              {profile.phone && (
                <InfoChip icon={Phone}>{profile.phone}</InfoChip>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              {profile.linkedin_url && (
                <a href={profile.linkedin_url.startsWith('http') ? profile.linkedin_url : `https://${profile.linkedin_url}`}
                   target="_blank" rel="noreferrer">
                  <InfoChip icon={Linkedin} link>LinkedIn</InfoChip>
                </a>
              )}
              {profile.github_url && (
                <a href={profile.github_url.startsWith('http') ? profile.github_url : `https://${profile.github_url}`}
                   target="_blank" rel="noreferrer">
                  <InfoChip icon={Github} link>GitHub</InfoChip>
                </a>
              )}
              {profile.portfolio_url && (
                <a href={profile.portfolio_url.startsWith('http') ? profile.portfolio_url : `https://${profile.portfolio_url}`}
                   target="_blank" rel="noreferrer">
                  <InfoChip icon={Globe} link>Portfolio</InfoChip>
                </a>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/onboarding?edit=true')}
          className="flex items-center gap-2 px-4 py-2 bg-primary-light/10 text-primary-dark text-sm font-semibold rounded-xl hover:bg-primary-light/20 transition-all shrink-0"
        >
          <Pencil className="w-4 h-4" /> Edit
        </button>
      </div>

      {/* Skills */}
      {(skills.length > 0 || strongest.length > 0 || fitTitles.length > 0) && (
        <Section title="Extracted Skills">
          {skills.length > 0 && (
            <TagGroup label="Skills" tags={skills} color="blue" />
          )}
          {strongest.length > 0 && (
            <TagGroup label="Strongest Areas" tags={strongest} color="emerald" />
          )}
          {fitTitles.length > 0 && (
            <TagGroup label="Best Fit Roles" tags={fitTitles} color="orange" />
          )}
          {profile.skills_extracted?.years_experience && (
            <p className="text-sm text-gray-500 mt-2">
              <span className="font-semibold text-gray-700">{profile.skills_extracted.years_experience}</span> years of experience
            </p>
          )}
        </Section>
      )}

      {/* Job Preferences */}
      {Object.keys(prefs).length > 0 && (
        <Section title="Job Preferences">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PrefItem label="Open To"       value={Array.isArray(prefs.roles_open_to) ? prefs.roles_open_to.join(', ') : prefs.roles_open_to} />
            <PrefItem label="Excluding"     value={prefs.roles_to_exclude} />
            <PrefItem label="Min Salary"    value={prefs.min_salary} />
            <PrefItem label="Employment"    value={prefs.employment_type} capitalize />
            <PrefItem label="Outreach Tone" value={prefs.tone_preference} capitalize />
          </div>
        </Section>
      )}

      {/* CV Text */}
      {profile.cv_raw_text && (
        <Section title="CV / Resume">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">{profile.cv_raw_text.length.toLocaleString()} characters</span>
            <button
              onClick={() => setCvExpanded(v => !v)}
              className="ml-auto flex items-center gap-1 text-xs font-semibold text-primary-dark hover:text-primary-light transition-colors"
            >
              {cvExpanded ? <><ChevronUp className="w-3.5 h-3.5" /> Collapse</> : <><ChevronDown className="w-3.5 h-3.5" /> Expand</>}
            </button>
          </div>
          <div className={`bg-gray-50 rounded-xl p-4 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-mono overflow-auto transition-all ${
            cvExpanded ? 'max-h-none' : 'max-h-40'
          }`}>
            {profile.cv_raw_text}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">{title}</h2>
      {children}
    </div>
  );
}

function InfoChip({ icon: Icon, children, link }) {
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${link ? 'text-primary-dark hover:underline cursor-pointer' : 'text-gray-500'}`}>
      <Icon className="w-3.5 h-3.5" />
      {children}
    </span>
  );
}

function TagGroup({ label, tags, color }) {
  const colorMap = {
    blue:    'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    orange:  'bg-orange-50 text-primary-dark border-orange-100',
  };
  return (
    <div className="mb-3">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag} className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${colorMap[color]}`}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function PrefItem({ label, value, capitalize }) {
  if (!value) return null;
  return (
    <div className="bg-gray-50 rounded-xl px-4 py-3">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-semibold text-gray-700 ${capitalize ? 'capitalize' : ''}`}>{value}</p>
    </div>
  );
}
