import React, { useRef, useState } from'react';
import { useNavigate } from'react-router-dom';
import { useQuery } from'@tanstack/react-query';
import { CheckCircle2, MapPin, Loader2, ArrowRight, UserX, ExternalLink } from'lucide-react';
import { getJob } from'../services/apiJobs';

// ── Acted opportunity card ────────────────────────────────────────────────
// After the user taps"Write Intro" the card does NOT leave Opportunities — it
// stays in place, picks up the brand-orange left accent, and polls the job
// until the headhunter has found a contact and drafted the intro. Two terminal
// states:
// • drafted → contact found, intro ready →"View on Intros"
// • no_contact → Hunter found nobody →"Apply Direct" (+ optional tracking)
// Until then it shows a calm"finding…" state. The card title still opens the
// detail drawer in every state.

const POLL_GIVE_UP_MS = 90000;

const ActedOpportunityCard = ({ job, onOpenDrawer, onApplyDirect }) => {
 const navigate = useNavigate();
 const startRef = useRef(Date.now());
 const [trackChecked, setTrackChecked] = useState(true);

 const { data: detail } = useQuery({
 queryKey: ['job-detail', job.id],
 queryFn: () => getJob(job.id),
 initialData: job,
 // Poll every 3s until a terminal state, then stop: a draft exists, OR the
 // job was flagged manual_apply (no contact found — no draft is coming).
 // Give up after 90s so a stalled background job never polls forever.
 refetchInterval: (query) => {
 const d = query.state.data;
 if (d?.has_draft || d?.status ==='manual_apply') return false;
 if (Date.now() - startRef.current > POLL_GIVE_UP_MS) return false;
 return 3000;
 },
 });

 const hasDraft = !!detail?.has_draft;
 const hasRealContact = !!detail?.has_real_contact;
 const primary = detail?.primary_contact;
 const noContact = detail?.status ==='manual_apply' || (hasDraft && !hasRealContact);

 // manual_apply (no contact) is terminal even without a draft now that we no
 // longer draft against placeholders.
 const stage = noContact ?'no_contact' : hasDraft && hasRealContact ?'drafted' :'finding';

 // Hand off to the shared Apply Direct modal (tailored-CV offer + tracking),
 // passing the merged job (so it has apply_url) and the tracking choice.
 const handleApplyDirect = () => {
 onApplyDirect?.({ ...job, ...detail }, trackChecked);
 };

 const contactLine = primary
 ?`${primary.name}${primary.title ?`, ${primary.title}` :''}`
 :'';

 return (
 <div className="group relative overflow-hidden bg-white rounded-2xl border border-neutral-dark border-l-4 border-l-primary-light shadow-sm p-6 flex flex-col h-full">
 {/* Header — title opens the detail drawer */}
 <div className="flex items-start gap-3">
 <span className="w-11 h-11 shrink-0 rounded-xl bg-neutral text-secondary-dark border border-neutral-dark flex items-center justify-center font-bold text-base">
 {(job.company_name ||'?').trim().charAt(0).toUpperCase()}
 </span>
 <div className="min-w-0 flex-1">
 <button
 type="button"
 onClick={() => onOpenDrawer(job.id)}
 className="text-left w-full"
 >
 <h2 className="text-lg font-bold text-black-light leading-snug line-clamp-2 hover:text-primary-dark transition-colors">
 {job.title}
 </h2>
 </button>
 <p className="text-sm text-secondary-dark mt-0.5 flex items-center gap-1.5 flex-wrap">
 <span className="font-medium text-black-light truncate max-w-full">{job.company_name}</span>
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

 {/* Body — state-dependent */}
 <div className="mt-5 flex-1">
 {stage ==='finding' && (
 <div className="flex items-start gap-2 text-sm text-secondary-dark">
 <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin text-primary-light" />
 <span>Finding the hiring manager and writing your intro…</span>
 </div>
 )}

 {stage ==='drafted' && (
 <div className="space-y-2">
 <p className="text-sm text-black-light flex items-start gap-1.5">
 <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
 <span>Contact: <span className="font-semibold">{contactLine}</span></span>
 </p>
 <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-1 text-xs font-semibold">
 Intro drafted — review on Introductions
 </span>
 </div>
 )}

 {stage ==='no_contact' && (
 <div className="space-y-3">
 <p className="text-sm text-black-light flex items-start gap-1.5">
 <UserX className="w-4 h-4 mt-0.5 shrink-0 text-secondary-dark" />
 <span className="font-semibold">No hiring manager found</span>
 </p>
 <label className="flex items-center gap-2 text-xs text-secondary-dark cursor-pointer select-none">
 <input
 type="checkbox"
 checked={trackChecked}
 onChange={(e) => setTrackChecked(e.target.checked)}
 className="w-4 h-4 rounded border-neutral-dark text-primary-light focus:ring-primary-light/30 accent-primary-light"
 />
 Track this application
 </label>
 </div>
 )}
 </div>

 {/* Action — pinned to the bottom so heights match the grid */}
 <div className="mt-auto pt-5">
 {stage ==='no_contact' ? (
 <button
 onClick={handleApplyDirect}
 className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all"
 >
 Apply Direct <ExternalLink className="w-4 h-4" />
 </button>
 ) : (
 <button
 onClick={() => navigate('/dashboard/introductions')}
 disabled={stage ==='finding'}
 className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
 >
 View on Intros <ArrowRight className="w-4 h-4" />
 </button>
 )}
 </div>
 </div>
 );
};

export default ActedOpportunityCard;
