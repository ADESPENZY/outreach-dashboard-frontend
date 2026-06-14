import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, CheckCircle, Users, Send, Check } from 'lucide-react';
import { getAnalytics } from '../services/apiAnalytics';

// The whole-journey map. One thin row that shows where the user is across the
// five stages and lets them jump to the relevant page. Derives stage from the
// analytics pipeline counts (one cached call, shared with the analytics view).
const STAGES = [
  { id: 'scrape',   label: 'Scrape',   Icon: Search,      route: '/dashboard/jobs' },
  { id: 'score',    label: 'Score',    Icon: Sparkles,    route: '/dashboard/jobs' },
  { id: 'approve',  label: 'Approve',  Icon: CheckCircle, route: '/dashboard/jobs' },
  { id: 'outreach', label: 'Outreach', Icon: Users,       route: '/dashboard/outreach' },
  { id: 'send',     label: 'Send',     Icon: Send,        route: '/dashboard/outreach' },
];

export default function PipelineStepper() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 30],
    queryFn: () => getAnalytics(30),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data) return null;

  const p = data.pipeline || {};
  const s = data.summary || {};
  const scored = (p.approved_jobs || 0) + (p.rejected_jobs || 0);

  // completed = how many stages are fully achieved; the next one is "active".
  let completed = 0;
  if ((p.total_jobs || 0) > 0) completed = 1;
  if (scored > 0) completed = 2;
  if ((p.approved_jobs || 0) > 0) completed = 3;
  if ((p.total_contacts || 0) > 0) completed = 4;
  if ((s.total_sent || 0) > 0) completed = 5;

  return (
    <div className="w-full bg-white border border-neutral-dark rounded-2xl shadow-sm px-4 py-3.5 md:px-6">
      <div className="flex items-center">
        {STAGES.map((stage, i) => {
          const isDone   = i < completed;
          const isActive = i === completed;
          const Icon = stage.Icon;
          return (
            <React.Fragment key={stage.id}>
              <button
                onClick={() => navigate(stage.route)}
                className="flex flex-col items-center gap-1.5 group shrink-0"
                title={`Go to ${stage.label}`}
              >
                <span
                  className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center border transition-all ${
                    isDone
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : isActive
                        ? 'bg-primary-light/10 border-primary-light text-primary-dark ring-4 ring-primary-light/15'
                        : 'bg-neutral border-neutral-dark text-secondary-dark/40'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </span>
                <span
                  className={`text-[10px] md:text-[11px] font-semibold tracking-wide ${
                    isActive ? 'text-primary-dark' : isDone ? 'text-emerald-600' : 'text-secondary-dark/50'
                  }`}
                >
                  {stage.label}
                </span>
              </button>
              {i < STAGES.length - 1 && (
                <div className="flex-1 h-0.5 mx-1.5 md:mx-2 rounded-full -mt-5">
                  <div className={`h-full rounded-full transition-all ${i < completed ? 'bg-emerald-500' : 'bg-neutral-dark'}`} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
