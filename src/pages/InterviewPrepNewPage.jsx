import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  ArrowLeft, ArrowRight, CheckCircle2, FileText, ClipboardPaste, Loader2,
  AlertCircle, Search, Link2,
} from 'lucide-react';
import { getProfile } from '../services/apiProfile';
import {
  createInterviewSession, prepareInterviewSession, updateInterviewSession,
} from '../services/apiInterview';
import AnswerStylePicker from '../components/interview/AnswerStylePicker';
import { DEFAULT_ANSWER_STYLE } from '../constants/answerStyles';
import { settingsPath } from '../constants/settingsSections';

// ── Interview Prep — new prep wizard ─────────────────────────────────────────
// Step 1: which CV the answers come from. Step 2: the role. Step 3: how the
// answers should sound. Then we create the interview, set its style, and write
// its likely questions + answers (one slow model call — up to a minute), before
// handing over to the live copilot.
//
// Two requests, deliberately separate: if preparing fails, "Try again" re-runs
// ONLY the prep on the interview we already created, never a second interview.

const MAX_TEXT = 50000;   // backend limit for pasted CV / job description
const INPUT = 'w-full px-3 py-2 rounded-xl border border-neutral-dark bg-white text-sm text-black outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all';
const LABEL = 'block text-[11px] font-bold text-secondary-dark/60 uppercase tracking-wider mb-1.5 font-montserrat';
const PRIMARY = 'inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat text-sm rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
const SECONDARY = 'inline-flex items-center justify-center gap-2 bg-neutral hover:bg-neutral-dark text-black-light font-semibold text-sm rounded-xl px-5 py-2.5 transition-all';

export default function InterviewPrepNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // "Prep for this" on the Interview Prep page links here with the job attached,
  // so the job description and company come from the saved job.
  const [params] = useSearchParams();
  const jobId = Number(params.get('job_id')) || null;
  const jobRole = params.get('role') || '';
  const jobCompany = params.get('company') || '';
  const { data: profile, isLoading: profileLoading } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const profileCv = (profile?.cv_raw_text || '').trim();

  const [step, setStep] = useState(1);
  const [cvChoice, setCvChoice] = useState(null);         // 'base' | 'custom'
  const [cvText, setCvText] = useState('');
  const [companyName, setCompanyName] = useState(jobCompany);
  const [jdText, setJdText] = useState('');
  // Seeded from the profile default below, then overridable for this interview.
  const [answerStyle, setAnswerStyle] = useState(DEFAULT_ANSWER_STYLE);

  // phase: 'form' → 'creating' → 'preparing' → 'ready' | 'failed'
  const [phase, setPhase] = useState('form');
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);
  const [count, setCount] = useState(0);

  // Default to the profile CV once we know whether there is one.
  const choice = cvChoice ?? (profileCv ? 'base' : 'custom');
  const step1Done = choice === 'base' ? !!profileCv : cvText.trim().length > 0;
  // A linked job already carries its own description and company.
  const step2Done = !!jobId || companyName.trim().length > 0 || jdText.trim().length > 0;
  const stepDone = { 1: step1Done, 2: step2Done, 3: true }[step];

  // Start from the user's saved default; they can pick something else here
  // without changing the default.
  const profileStyle = profile?.answer_style_default;
  useEffect(() => {
    if (profileStyle) setAnswerStyle(profileStyle);
  }, [profileStyle]);

  async function prepare(target) {
    setPhase('preparing');
    setError('');
    try {
      const { count: n } = await prepareInterviewSession(target.id);
      if (!n) throw new Error("We couldn't write any questions this time.");
      setCount(n);
      setPhase('ready');
    } catch (err) {
      setError(err.message);
      setPhase('failed');
    } finally {
      queryClient.invalidateQueries({ queryKey: ['interviewSessions'] });
    }
  }

  async function submit() {
    setPhase('creating');
    setError('');
    try {
      const created = await createInterviewSession({
        cvSource: choice, cvText, jdText: jdText.trim(), companyName: companyName.trim(),
        jobId,
      });
      // BEFORE preparing: the bank is written in the session's style.
      if (answerStyle && answerStyle !== created.answer_style) {
        try {
          await updateInterviewSession(created.id, { answerStyle });
        } catch {
          // Not worth failing the whole prep — it just falls back to the default.
        }
      }
      setSession(created);
      queryClient.invalidateQueries({ queryKey: ['interviewSessions'] });
      await prepare(created);
    } catch (err) {
      setError(err.message);
      setPhase('form');
    }
  }

  // The style step shows three sample cards side by side; give it room.
  const width = step === 3 && phase === 'form' ? 'max-w-5xl' : 'max-w-2xl';

  return (
    <div className={`p-4 md:p-8 w-full ${width} mx-auto space-y-6 font-roboto transition-[max-width] duration-300`}>
      <Link
        to="/dashboard/interview"
        className="inline-flex items-center gap-1.5 text-sm text-secondary-dark hover:text-black-light hover:bg-neutral rounded-lg px-3 py-2 -ml-3 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Interview Prep
      </Link>

      {phase === 'creating' || phase === 'preparing' ? (
        <Working phase={phase} />
      ) : phase === 'ready' ? (
        <Ready
          count={count}
          onStart={() => navigate(`/dashboard/interview/${session.id}/live`)}
        />
      ) : phase === 'failed' ? (
        <Failed error={error} onRetry={() => prepare(session)} />
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm">
          <div className="px-6 py-5 border-b border-neutral-dark">
            <p className="text-xs text-secondary-dark">Step {step} of 3</p>
            <h1 className="text-lg font-bold font-montserrat text-black-light mt-0.5">
              {{ 1: 'Which CV are you using?', 2: 'About the role',
                 3: 'How should your answers sound?' }[step]}
            </h1>
          </div>

          <div className="px-6 py-5 space-y-4">
            {step === 1 ? (
              <StepCv
                loading={profileLoading}
                profileCv={profileCv}
                choice={choice}
                onChoice={setCvChoice}
                cvText={cvText}
                onCvText={setCvText}
              />
            ) : step === 2 ? (
              <StepRole
                companyName={companyName}
                onCompanyName={setCompanyName}
                jdText={jdText}
                onJdText={setJdText}
                linkedJob={jobId ? { role: jobRole, company: jobCompany } : null}
              />
            ) : (
              <AnswerStylePicker
                value={answerStyle}
                onChange={setAnswerStyle}
                title="Pick the voice for this interview"
                description="Listen to each one. You can switch mid-interview, and this doesn't change your usual default."
              />
            )}

            {error && (
              <p className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}
          </div>

          <div className="px-6 py-4 border-t border-neutral-dark flex items-center justify-between gap-3">
            {step > 1 ? (
              <button type="button" onClick={() => setStep(step - 1)} className={SECONDARY}>
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Back
              </button>
            ) : <span />}
            {step < 3 ? (
              <button type="button" disabled={!stepDone} onClick={() => setStep(step + 1)} className={PRIMARY}>
                Continue
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            ) : (
              <button type="button" disabled={!step2Done} onClick={submit} className={PRIMARY}>
                Prepare my answers
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChoiceCard({ selected, disabled, onClick, icon, title, children }) {
  const Icon = icon;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={[
        'w-full text-left flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-light/20',
        selected
          ? 'border-primary-light bg-primary-light/5'
          : 'border-neutral-dark hover:border-primary-light/30 hover:bg-neutral',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${selected ? 'bg-primary-light/10 text-primary-dark' : 'bg-neutral text-secondary-dark'}`}>
        <Icon className="w-4 h-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-black-light">{title}</span>
        <span className="block text-xs text-secondary-dark mt-0.5 leading-relaxed">{children}</span>
      </span>
    </button>
  );
}

function StepCv({ loading, profileCv, choice, onChoice, cvText, onCvText }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-secondary-dark py-6 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        Checking your profile…
      </div>
    );
  }
  return (
    <>
      <p className="text-sm text-secondary-dark leading-relaxed">
        Your answers are built only from this CV, so pick the one this company has seen.
      </p>
      <div role="radiogroup" aria-label="Which CV are you using?" className="space-y-2">
        <ChoiceCard
          selected={choice === 'base'}
          disabled={!profileCv}
          onClick={() => onChoice('base')}
          icon={FileText}
          title="My profile CV"
        >
          {profileCv ? (
            'The CV saved on your ApplyDir profile.'
          ) : (
            <>
              You haven't added one yet.{' '}
              <Link to={settingsPath('cv')} className="font-semibold text-primary-dark hover:text-primary-light">
                Add your CV
              </Link>
            </>
          )}
        </ChoiceCard>
        <ChoiceCard
          selected={choice === 'custom'}
          onClick={() => onChoice('custom')}
          icon={ClipboardPaste}
          title="Paste a different CV"
        >
          Applied with another version? Paste that one so your answers match it.
        </ChoiceCard>
      </div>

      {choice === 'custom' && (
        <div>
          <label htmlFor="cv-text" className={LABEL}>Your CV</label>
          <textarea
            id="cv-text"
            rows={10}
            maxLength={MAX_TEXT}
            value={cvText}
            onChange={(e) => onCvText(e.target.value)}
            placeholder="Paste the full text of the CV you sent them…"
            className={`${INPUT} resize-y leading-relaxed`}
          />
        </div>
      )}
    </>
  );
}

function StepRole({ companyName, onCompanyName, jdText, onJdText, linkedJob }) {
  const researchOnly = companyName.trim() && !jdText.trim();
  return (
    <>
      {linkedJob ? (
        <p className="flex items-start gap-2 text-sm text-secondary-dark bg-neutral rounded-xl px-3 py-2.5 leading-relaxed">
          <Link2 className="w-4 h-4 mt-0.5 shrink-0 text-primary-light" aria-hidden="true" />
          <span>
            Using the job you saved
            {linkedJob.role ? <> — <span className="font-semibold text-black-light">{linkedJob.role}</span></> : null}
            {linkedJob.company ? <> at <span className="font-semibold text-black-light">{linkedJob.company}</span></> : null}.
            We'll read its description, so there's nothing to paste. Add anything extra below if you want.
          </span>
        </p>
      ) : (
        <p className="text-sm text-secondary-dark leading-relaxed">
          The more you tell us, the closer the questions get. Paste the job description
          if you have it — the company name on its own works too.
        </p>
      )}
      <div>
        <label htmlFor="company-name" className={LABEL}>Company</label>
        <input
          id="company-name"
          type="text"
          maxLength={255}
          value={companyName}
          onChange={(e) => onCompanyName(e.target.value)}
          placeholder="e.g. Globex"
          className={INPUT}
        />
      </div>
      <div>
        <label htmlFor="jd-text" className={LABEL}>Job description</label>
        <textarea
          id="jd-text"
          rows={8}
          maxLength={MAX_TEXT}
          value={jdText}
          onChange={(e) => onJdText(e.target.value)}
          placeholder="Paste the job posting…"
          className={`${INPUT} resize-y leading-relaxed`}
        />
      </div>
      {researchOnly && (
        <p className="flex items-start gap-2 text-xs text-secondary-dark bg-neutral rounded-xl px-3 py-2.5 leading-relaxed">
          <Search className="w-4 h-4 mt-px shrink-0 text-accent-teal" aria-hidden="true" />
          No job description? No problem — we'll look up {companyName.trim()} for you and
          tailor the questions to what they do.
        </p>
      )}
    </>
  );
}

function Working({ phase }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm px-6 py-14 text-center" role="status" aria-live="polite">
      <Loader2 className="w-8 h-8 mx-auto mb-4 text-primary-light animate-spin" aria-hidden="true" />
      <p className="text-base font-bold font-montserrat text-black-light">
        {phase === 'creating' ? 'Setting up your interview…' : 'Writing your likely questions and answers…'}
      </p>
      <p className="text-sm text-secondary-dark mt-1 leading-relaxed">
        {phase === 'creating'
          ? 'Getting the role and your CV ready.'
          : 'This usually takes under a minute. Keep this page open.'}
      </p>
    </div>
  );
}

function Ready({ count, onStart }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm px-6 py-12 text-center">
      <CheckCircle2 className="w-10 h-10 mx-auto mb-4 text-emerald-500" aria-hidden="true" />
      <p className="text-lg font-bold font-montserrat text-black-light">
        Ready — {count} questions prepared.
      </p>
      <p className="text-sm text-secondary-dark mt-1 mb-6 leading-relaxed max-w-sm mx-auto">
        When your interview starts, open the live copilot. It listens along and suggests
        what to say, starting from these answers.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button type="button" onClick={onStart} className={PRIMARY}>
          Start live copilot
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
        <Link to="/dashboard/interview" className={SECONDARY}>Done for now</Link>
      </div>
    </div>
  );
}

function Failed({ error, onRetry }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm px-6 py-12 text-center">
      <AlertCircle className="w-9 h-9 mx-auto mb-3 text-red-500" aria-hidden="true" />
      <p className="text-base font-bold font-montserrat text-black-light">We couldn't finish preparing</p>
      <p className="text-sm text-secondary-dark mt-1 mb-6 leading-relaxed max-w-sm mx-auto">
        {error || 'Something went wrong.'} Your interview is saved — try again and we'll
        pick up where we left off.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button type="button" onClick={onRetry} className={PRIMARY}>Try again</button>
        <Link to="/dashboard/interview" className={SECONDARY}>Back to Interview Prep</Link>
      </div>
    </div>
  );
}
