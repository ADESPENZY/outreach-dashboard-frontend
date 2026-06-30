import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, ExternalLink, ArrowRight } from 'lucide-react';
import { ApplyDirLoader } from './ui/ApplyDirLoader';
import { getJob } from '../services/apiJobs';
import GenerateCvButton from './GenerateCvButton';

// ── Opportunity detail drawer ─────────────────────────────────────────────
// Slides in from the right on desktop (rounded-2xl, max-w-lg), full-screen on
// mobile with a top close bar. Closes on X, outside click, or Escape. The card
// in the grid behind stays untouched — this is a read-mostly detail view with
// the same two actions (Skip / Reach Out) repeated at the bottom.

// Match-strength badge — mirrors the Opportunities card so the signal reads the
// same in both places. No numbers ever reach the user.
const matchBadge = (score) => {
  if (score == null) return { label: 'New match',    cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  if (score >= 80)   return { label: 'Strong match', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (score >= 60)   return { label: 'Good match',   cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
  return { label: 'Fair match', cls: 'bg-gray-100 text-gray-500 border-gray-200' };
};

// Lightweight client-side skill extraction — surfaces known skills that appear
// in the JD as tags. No extra API cost; purely a reading aid.
const SKILL_DICTIONARY = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Golang', 'Ruby', 'Rust',
  'C++', 'C#', 'PHP', 'Swift', 'Kotlin', 'Scala', 'Elixir',
  'React', 'React Native', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Redux',
  'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Rails', 'Spring', 'Laravel',
  'GraphQL', 'REST', 'gRPC', 'WebSockets',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'SQL',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Jenkins',
  'Tailwind', 'CSS', 'HTML', 'Sass', 'Figma',
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP', 'LLM',
  'Data Engineering', 'Spark', 'Kafka', 'Airflow', 'ETL',
  'Microservices', 'Serverless', 'DevOps', 'Agile', 'Scrum',
  'Product Management', 'Leadership', 'Stakeholder Management',
];

// Many job feeds (Remotive, RemoteOK, …) store the description as HTML. Render
// it as clean, readable text — strip tags, keep paragraph/list breaks, decode
// entities. Pure string ops, so there's no XSS surface (we never inject HTML).
const _NAMED_ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
  '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–', '&hellip;': '…', '&bull;': '•',
  '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”', '&copy;': '©',
  '&reg;': '®', '&trade;': '™', '&deg;': '°', '&euro;': '€', '&pound;': '£',
};

function htmlToText(html) {
  if (!html) return '';
  let s = String(html);
  s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n');               // <br> → newline
  s = s.replace(/<\s*li[^>]*>/gi, '\n• ');                 // <li> → bullet
  s = s.replace(/<\/\s*(p|div|li|ul|ol|h[1-6]|tr|section|blockquote)\s*>/gi, '\n');
  s = s.replace(/<[^>]+>/g, '');                           // strip remaining tags
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  s = s.replace(/&[a-z]+;/gi, (m) => _NAMED_ENTITIES[m.toLowerCase()] ?? ' ');
  s = s.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

function extractSkills(description) {
  if (!description) return [];
  const found = [];
  for (const skill of SKILL_DICTIONARY) {
    // Escape regex specials, match as a whole token (word-boundary-ish).
    const safe = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-zA-Z0-9])${safe}([^a-zA-Z0-9]|$)`, 'i');
    if (re.test(description) && !found.includes(skill)) found.push(skill);
    if (found.length >= 12) break;
  }
  return found;
}

const JobDetailDrawer = ({ jobId, isOpen, onClose, onSkip, onWriteIntro, showActions = true, actionPending = false }) => {
  // Escape to close.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const { data: job, isLoading } = useQuery({
    queryKey: ['job-detail', jobId],
    queryFn: () => getJob(jobId),
    enabled: isOpen && !!jobId,
    staleTime: 30000,
  });

  const match = matchBadge(job?.fit_score);
  const descriptionText = htmlToText(job?.description);
  const skills = extractSkills(descriptionText);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay — outside click closes */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel — full-screen on mobile, right-side drawer on desktop */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Opportunity details"
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl sm:max-w-lg sm:rounded-l-2xl font-roboto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          >
            {/* Top close bar */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-neutral-dark shrink-0">
              <span className="text-[11px] font-bold font-montserrat uppercase tracking-widest text-secondary-dark/60">
                Opportunity details
              </span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-2 rounded-lg text-secondary-dark/70 hover:text-black-light hover:bg-neutral transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <ApplyDirLoader.Inline message="Loading the role..." />
              </div>
            ) : !job ? (
              <div className="flex-1 flex items-center justify-center px-6 text-center">
                <p className="text-sm text-secondary-dark">We couldn&rsquo;t load this role. Please close and try again.</p>
              </div>
            ) : (
              <>
                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                  {/* Identity */}
                  <div className="flex items-start gap-3">
                    <span className="w-12 h-12 shrink-0 rounded-xl bg-neutral text-secondary-dark border border-neutral-dark flex items-center justify-center font-montserrat font-bold text-lg">
                      {(job.company_name || '?').trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-montserrat text-xl font-bold text-black-light leading-snug">
                        {job.title}
                      </h2>
                      <p className="text-sm text-secondary-dark mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-black-light">{job.company_name}</span>
                        {job.location && (
                          <>
                            <span className="text-secondary-dark/40">·</span>
                            <span className="inline-flex items-center gap-1 min-w-0">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{job.location}</span>
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Match + salary */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${match.cls}`}>
                      {match.label}
                    </span>
                    {job.salary_info && (
                      <span className="text-sm font-semibold text-emerald-600">{job.salary_info}</span>
                    )}
                  </div>

                  {/* Skills mentioned */}
                  {skills.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-[11px] font-bold font-montserrat uppercase tracking-widest text-secondary-dark/60">
                        Skills mentioned
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {skills.map((s) => (
                          <span key={s} className="inline-flex items-center rounded-full bg-neutral text-secondary-dark border border-neutral-dark px-2.5 py-1 text-xs font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full description — or, when there's none, a link out to the
                      live listing. If there's neither, the section is omitted. */}
                  {descriptionText ? (
                    <div className="space-y-2">
                      <h3 className="text-[11px] font-bold font-montserrat uppercase tracking-widest text-secondary-dark/60">
                        About the role
                      </h3>
                      <p className="text-sm text-black-light leading-relaxed whitespace-pre-line">
                        {descriptionText}
                      </p>
                    </div>
                  ) : job.apply_url ? (
                    <a
                      href={job.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-dark hover:text-primary-light transition-colors"
                    >
                      View full listing <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : null}

                  {/* Apply manually — present whenever there's a link AND we showed
                      a description above (avoids duplicating the link). */}
                  {job.apply_url && descriptionText && (
                    <a
                      href={job.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-dark hover:text-primary-light transition-colors"
                    >
                      Apply manually <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* Tailored CV — this is the natural place to offer it: the user
                      is reading the role in depth. */}
                  <div className="pt-2 border-t border-neutral-dark">
                    <p className="text-[11px] font-bold font-montserrat uppercase tracking-widest text-secondary-dark/60 mb-2">
                      Tailored CV
                    </p>
                    <GenerateCvButton job={job} hasCv={job.has_cv} />
                  </div>
                </div>

                {/* Sticky footer actions */}
                {showActions && (
                  <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-t border-neutral-dark bg-white">
                    <button
                      onClick={onSkip}
                      disabled={actionPending}
                      className="inline-flex items-center justify-center gap-2 text-secondary-dark hover:bg-neutral font-semibold rounded-xl px-5 py-2.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Skip
                    </button>
                    <button
                      onClick={onWriteIntro}
                      disabled={actionPending}
                      className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {actionPending
                        ? <><ApplyDirLoader.Button variant="light" /> Reaching out…</>
                        : <>Reach Out <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default JobDetailDrawer;
