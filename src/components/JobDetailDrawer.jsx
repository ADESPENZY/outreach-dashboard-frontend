import React, { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MapPin, ExternalLink, ArrowRight, Briefcase, DollarSign, TrendingUp,
} from 'lucide-react';
import { ApplyDirLoader } from './ui/ApplyDirLoader';
import { getJob } from '../services/apiJobs';
import { getProfile } from '../services/apiProfile';
import GenerateCvButton from './GenerateCvButton';

// ── Opportunity detail drawer ─────────────────────────────────────────────
// Slides in from the right on desktop (rounded-2xl, max-w-lg), full-screen on
// mobile with a top close bar. Closes on X, outside click, or Escape. The card
// in the grid behind stays untouched — this is a read-mostly detail view with
// the same two actions (Skip / Reach Out) repeated at the bottom.
//
// The body renders one of three ways, in this order of preference:
//   1. `structured_jd` present → sectioned layout (skills / responsibilities /
//      requirements / summary + a Job Details panel). The backend extracts this
//      once on first open and caches it, so this is the normal path.
//   2. `structured_jd` null but `description` present → the raw body, parsed
//      into real paragraphs and lists. Not one flattened block of text.
//   3. Neither → a link out to the live listing.

// Match-strength badge — mirrors the Opportunities card so the signal reads the
// same in both places. No numbers ever reach the user.
const matchBadge = (score) => {
  if (score == null) return { label: 'New match',    cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  if (score >= 80)   return { label: 'Strong match', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (score >= 60)   return { label: 'Good match',   cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
  return { label: 'Fair match', cls: 'bg-gray-100 text-gray-500 border-gray-200' };
};

// ── Plain-description fallback (path 2 only) ──────────────────────────────
// Kept deliberately: three feeds (Remotive, RemoteOK, Himalayas) store the
// description as RAW HTML, so without this their bodies would render literal
// `<div class="h3">` markup on screen. It is no longer the primary render path —
// it only pre-cleans the text that parseBlocks() then splits into real elements.
// Pure string ops, so there's no XSS surface (we never inject HTML).
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
  s = s.replace(/<\/\s*li\s*>/gi, '\n');                   // one bullet per line
  // Block-level closers end a PARAGRAPH. A single \n here would let parseBlocks
  // glue a heading onto the text after it ("About us We deliver elite…").
  s = s.replace(/<\/\s*(p|div|ul|ol|h[1-6]|tr|section|blockquote)\s*>/gi, '\n\n');
  s = s.replace(/<[^>]+>/g, '');                           // strip remaining tags
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  s = s.replace(/&[a-z]+;/gi, (m) => _NAMED_ENTITIES[m.toLowerCase()] ?? ' ');
  s = s.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

const BULLET_LINE = /^\s*[-•*+·]\s+/;

// Split cleaned text into renderable blocks: { type: 'p' | 'ul' }.
// Runs of bullet lines become one list; blank lines end a paragraph. Any literal
// ** stays as plain text — this path does no markdown rendering by design.
function parseBlocks(text) {
  if (!text) return [];
  const blocks = [];
  let para = [];
  let list = [];

  const flushPara = () => {
    if (para.length) { blocks.push({ type: 'p', text: para.join(' ') }); para = []; }
  };
  const flushList = () => {
    if (list.length) { blocks.push({ type: 'ul', items: list }); list = []; }
  };

  for (const rawLine of String(text).replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line) { flushPara(); flushList(); continue; }
    if (BULLET_LINE.test(line)) {
      flushPara();
      list.push(line.replace(BULLET_LINE, '').trim());
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks.filter((b) => (b.type === 'p' ? b.text : b.items.length));
}

// Skill comparison key — "Node.js", "NodeJS" and "node js" all collapse to
// "nodejs" so the profile match isn't defeated by punctuation. + and # survive
// so C++ and C# stay distinct.
const skillKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9+#]/g, '');

// ── Small building blocks ─────────────────────────────────────────────────
const Section = ({ title, children }) => (
  <section className="rounded-2xl border border-neutral-dark bg-white p-4 md:p-5">
    <h3 className="font-montserrat text-base font-bold text-black-light mb-3">{title}</h3>
    {children}
  </section>
);

const BulletList = ({ items }) => (
  <ul className="space-y-2">
    {items.map((item, i) => (
      <li key={`${i}-${item.slice(0, 24)}`} className="flex gap-2.5">
        <span
          className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary-light/60"
          aria-hidden="true"
        />
        <span className="min-w-0 break-words text-sm leading-relaxed text-black-light">{item}</span>
      </li>
    ))}
  </ul>
);

// One row of the Job Details panel. Renders nothing when the field is null —
// we never show "Not specified".
const DetailRow = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-secondary-dark/70" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs text-secondary-dark">{label}</p>
        <p className="break-words text-sm font-medium text-black-light">{value}</p>
      </div>
    </div>
  );
};

// Skeleton body. Shown while the detail request is in flight — which on a job's
// FIRST open includes the backend's one-off structured_jd extraction, so this
// can sit for a second or two. Loading states are mandatory (DESIGN_GUIDE §9/§10):
// never a blank panel, and never a bare spinner for a content panel.
const JdSkeleton = () => (
  <div className="flex-1 overflow-y-auto px-5 py-5" role="status">
    <span className="sr-only">Loading the role…</span>
    <div className="animate-pulse space-y-5" aria-hidden="true">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 rounded-xl bg-neutral-dark" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-5 w-3/4 rounded bg-neutral-dark" />
          <div className="h-3.5 w-1/2 rounded bg-neutral-dark/70" />
        </div>
      </div>
      <div className="h-6 w-28 rounded-md bg-neutral-dark" />
      <div className="space-y-3 rounded-2xl border border-neutral-dark p-4 md:p-5">
        <div className="h-4 w-32 rounded bg-neutral-dark" />
        <div className="flex flex-wrap gap-2">
          {[64, 48, 80, 56].map((w, i) => (
            <div key={i} className="h-6 rounded-full bg-neutral-dark/70" style={{ width: `${w}px` }} />
          ))}
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-neutral-dark p-4 md:p-5">
        <div className="h-4 w-40 rounded bg-neutral-dark" />
        <div className="h-3 w-full rounded bg-neutral-dark/70" />
        <div className="h-3 w-11/12 rounded bg-neutral-dark/70" />
        <div className="h-3 w-4/6 rounded bg-neutral-dark/70" />
      </div>
    </div>
  </div>
);

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

  // Same key + staleTime as JobsPage, so this shares the cache rather than
  // firing a second profile request when the drawer opens.
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
    enabled: isOpen,
  });

  const match = matchBadge(job?.fit_score);
  const jd = job?.structured_jd || null;

  const mySkillKeys = useMemo(() => {
    const list = profile?.skills_extracted?.skills;
    return new Set((Array.isArray(list) ? list : []).map(skillKey).filter(Boolean));
  }, [profile]);

  const jdSkills = useMemo(() => {
    const list = Array.isArray(jd?.skills) ? jd.skills : [];
    return list
      .filter((s) => typeof s === 'string' && s.trim())
      .map((s) => ({ name: s.trim(), matched: mySkillKeys.has(skillKey(s)) }));
  }, [jd, mySkillKeys]);

  const matchedCount = jdSkills.filter((s) => s.matched).length;

  // Only parsed when there's no structured_jd to show.
  const fallbackBlocks = useMemo(
    () => (jd ? [] : parseBlocks(htmlToText(job?.description))),
    [jd, job?.description],
  );

  const responsibilities = Array.isArray(jd?.responsibilities) ? jd.responsibilities : [];
  const requirements = Array.isArray(jd?.requirements) ? jd.requirements : [];
  const hasJobDetails = !!(jd && (jd.salary || jd.location || jd.employment_type || jd.level));
  // Drives the "Apply manually" vs dead-end link choice below.
  const hasBody = !!jd || fallbackBlocks.length > 0;

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
              <JdSkeleton />
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

                  {/* Match + salary — unchanged */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${match.cls}`}>
                      {match.label}
                    </span>
                    {job.salary_info && (
                      <span className="text-sm font-semibold text-emerald-600">{job.salary_info}</span>
                    )}
                  </div>

                  {/* ── Path 1: structured layout ───────────────────────── */}
                  {jd ? (
                    // One column on mobile, main + Job Details sidebar at md:.
                    // grid (not space-y) so the gap applies in both directions.
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
                      {/* Reclaim the sidebar's width when every Job Details field
                          is null — otherwise the column sits at 3/5 next to a
                          blank gutter. */}
                      <div className={`space-y-5 ${hasJobDetails ? 'md:col-span-3' : 'md:col-span-5'}`}>
                        {jdSkills.length > 0 && (
                          <Section title="Skills Match">
                            {mySkillKeys.size > 0 && matchedCount > 0 && (
                              <p className="-mt-1 mb-3 text-xs text-secondary-dark">
                                {matchedCount} of {jdSkills.length} match your profile
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {jdSkills.map(({ name, matched }) => (
                                <span
                                  key={name}
                                  title={matched ? 'On your profile' : undefined}
                                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                                    matched
                                      ? 'bg-primary-light/10 text-primary-dark border-primary-light/30 font-semibold'
                                      : 'bg-neutral text-secondary-dark border-neutral-dark'
                                  }`}
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          </Section>
                        )}

                        {responsibilities.length > 0 && (
                          <Section title="Core Responsibilities">
                            <BulletList items={responsibilities} />
                          </Section>
                        )}

                        {requirements.length > 0 && (
                          <Section title="Requirements">
                            <BulletList items={requirements} />
                          </Section>
                        )}

                        {jd.summary && (
                          <Section title="About the Role">
                            <p className="break-words text-sm leading-relaxed text-black-light">{jd.summary}</p>
                          </Section>
                        )}
                      </div>

                      {hasJobDetails && (
                        <div className="md:col-span-2">
                          <Section title="Job Details">
                            <div className="space-y-3.5">
                              <DetailRow icon={DollarSign} label="Salary" value={jd.salary} />
                              <DetailRow icon={MapPin} label="Location" value={jd.location} />
                              <DetailRow icon={Briefcase} label="Employment type" value={jd.employment_type} />
                              <DetailRow icon={TrendingUp} label="Level" value={jd.level} />
                            </div>
                          </Section>
                        </div>
                      )}
                    </div>
                  ) : fallbackBlocks.length > 0 ? (
                    /* ── Path 2: raw description, as real paragraphs + lists ── */
                    <Section title="About the role">
                      <div className="space-y-3">
                        {fallbackBlocks.map((block, i) =>
                          block.type === 'ul' ? (
                            <BulletList key={i} items={block.items} />
                          ) : (
                            <p key={i} className="break-words text-sm leading-relaxed text-black-light">
                              {block.text}
                            </p>
                          ),
                        )}
                      </div>
                    </Section>
                  ) : job.apply_url ? (
                    /* ── Path 3: nothing to show — send them to the listing ── */
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
                      a body above (avoids duplicating the link). */}
                  {job.apply_url && hasBody && (
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
