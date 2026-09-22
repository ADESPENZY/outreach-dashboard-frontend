import { Link, useParams } from 'react-router';
import { ArrowLeft, Mic } from 'lucide-react';

// ── Interview Prep — live copilot (PLACEHOLDER) ──────────────────────────────
// The live layer (microphone → VITE_COPILOT_WS_URL sidecar → suggested
// answers) lands in the next step. This screen only proves the route and hands
// the session id through.

export default function InterviewLivePage() {
  const { sessionId } = useParams();
  return (
    <div className="p-4 md:p-8 w-full max-w-2xl mx-auto space-y-6 font-roboto">
      <Link
        to="/dashboard/interview"
        className="inline-flex items-center gap-1.5 text-sm text-secondary-dark hover:text-black-light hover:bg-neutral rounded-lg px-3 py-2 -ml-3 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Interview Prep
      </Link>

      <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm px-6 py-14 text-center">
        <span className="w-12 h-12 rounded-2xl bg-primary-light/10 text-primary-dark flex items-center justify-center mx-auto mb-4">
          <Mic className="w-6 h-6" aria-hidden="true" />
        </span>
        <h1 className="text-lg font-bold font-montserrat text-black-light">Live copilot is almost here</h1>
        <p className="text-sm text-secondary-dark mt-1 leading-relaxed max-w-sm mx-auto">
          Soon this screen will listen along during your interview and suggest what to
          say. Your prepared answers are saved and waiting.
        </p>
        <p className="text-xs text-secondary-dark/80 mt-4">Interview #{sessionId}</p>
      </div>
    </div>
  );
}
