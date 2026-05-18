import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, Mail, Target, ChevronRight, Zap } from 'lucide-react';
import { getGmailAccounts } from '../services/apiGmail';
import { getAutoScoutSettings } from '../services/apiSettings';

const STEPS = [
  {
    id: 'inbox',
    icon: Mail,
    title: 'Connect Your Inbox',
    desc: 'Link a Gmail or Google Workspace account so we can send outreach on your behalf.',
    cta: 'Connect Email',
    route: '/dashboard/inboxes',
  },
  {
    id: 'scout',
    icon: Target,
    title: 'Activate Auto Scout',
    desc: 'Set your target job titles and let the engine find matching roles for you every day.',
    cta: 'Configure Auto Scout',
    route: '/dashboard/auto-scout',
  },
];

export default function SetupChecklist() {
  const navigate = useNavigate();

  const { data: inboxes = [], isLoading: loadingInboxes } = useQuery({
    queryKey: ['gmail-accounts'],
    queryFn: getGmailAccounts,
  });

  const { data: scoutSettings, isLoading: loadingScout } = useQuery({
    queryKey: ['auto-scout-settings'],
    queryFn: getAutoScoutSettings,
  });

  if (loadingInboxes || loadingScout) return null;

  const done = {
    inbox: inboxes.length > 0,
    scout: scoutSettings?.is_active === true,
  };

  // Vanish completely once both steps are complete
  if (done.inbox && done.scout) return null;

  const completedCount = Object.values(done).filter(Boolean).length;
  const pct = (completedCount / STEPS.length) * 100;

  return (
    <div className="bg-white border border-neutral-dark rounded-2xl shadow-sm overflow-hidden mb-6 animate-fade-in">
      {/* ── Header + progress bar ── */}
      <div className="px-6 pt-5 pb-4 border-b border-neutral-dark">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center shadow-sm shadow-primary-light/30 shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-black font-montserrat leading-tight">
                Complete Your Setup
              </h2>
              <p className="text-[11px] text-secondary-dark mt-0.5">
                {completedCount}/{STEPS.length} steps completed to fully automate your job hunt
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            {completedCount}/{STEPS.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-neutral rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-light to-primary-dark transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Steps ── */}
      <div className="divide-y divide-neutral">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isDone = done[step.id];

          return (
            <div
              key={step.id}
              className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                isDone ? 'bg-emerald-50/30' : 'bg-white hover:bg-neutral/30'
              }`}
            >
              {/* Status circle */}
              {isDone ? (
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-secondary-dark/25 shrink-0" />
              )}

              {/* Step icon badge */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  isDone
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-neutral border-neutral-dark'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isDone ? 'text-emerald-600' : 'text-secondary-dark/60'
                  }`}
                />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold leading-tight ${
                    isDone ? 'text-emerald-700' : 'text-black'
                  }`}
                >
                  {step.title}
                </p>
                {!isDone && (
                  <p className="text-[11px] text-secondary-dark mt-0.5 leading-relaxed">
                    {step.desc}
                  </p>
                )}
              </div>

              {/* CTA / Done badge */}
              {isDone ? (
                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3" /> Done
                </span>
              ) : (
                <button
                  onClick={() => navigate(step.route)}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-black/80 text-white text-xs font-bold rounded-xl transition-all active:scale-95 whitespace-nowrap shadow-sm"
                >
                  {step.cta}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
