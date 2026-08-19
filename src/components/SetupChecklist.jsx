import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, Mail, Target, ChevronRight } from 'lucide-react';
import { getGmailAccounts } from '../services/apiGmail';
import { getAutoScoutSettings } from '../services/apiSettings';
import { getProfile } from '../services/apiProfile';

// Compact, self-shrinking setup card. Completed steps collapse away, so it gets
// smaller as the user progresses and disappears entirely once all are done —
// it never clutters the dashboard.
const STEPS = [
  {
    id: 'cv',
    icon: FileText,
    title: 'Upload your CV',
    route: '/dashboard/jobs?activate=1',
  },
  {
    id: 'inbox',
    icon: Mail,
    title: 'Connect your inbox',
    route: '/dashboard/settings?tab=sending',
  },
  {
    id: 'scout',
    icon: Target,
    title: 'Activate Auto-Scout',
    route: '/dashboard/auto-scout',
  },
];

export default function SetupChecklist() {
  const navigate = useNavigate();

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
  });
  // /api/integrations/gmail/accounts/ is PAGINATED → {count, results:[...]}.
  // Normalize to an array. Key matches the rest of the app so this refreshes
  // when an inbox is connected on the Inboxes page.
  const { data: inboxData, isLoading: loadingInboxes } = useQuery({
    queryKey: ['gmailAccounts'],
    queryFn: getGmailAccounts,
  });
  const inboxes = Array.isArray(inboxData) ? inboxData : (inboxData?.results ?? []);
  const { data: scoutSettings, isLoading: loadingScout } = useQuery({
    queryKey: ['auto-scout-settings'],
    queryFn: getAutoScoutSettings,
    staleTime: 5 * 60 * 1000,
  });

  if (loadingProfile || loadingInboxes || loadingScout) return null;

  const done = {
    cv:    !!profile?.cv_raw_text,
    inbox: inboxes.length > 0,
    scout: scoutSettings?.is_active === true,
  };

  const completedCount = Object.values(done).filter(Boolean).length;
  const total = STEPS.length;

  // Vanish completely once everything is done.
  if (completedCount === total) return null;

  const pct = (completedCount / total) * 100;
  const remaining = STEPS.filter((s) => !done[s.id]);

  return (
    <div className="w-full max-w-sm bg-white border border-neutral-dark rounded-2xl shadow-sm overflow-hidden animate-fade-in">
      {/* Header + thin progress bar */}
      <div className="px-4 pt-3.5 pb-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-black font-montserrat">Complete setup</h2>
          <span className="text-[11px] font-bold text-secondary-dark">{completedCount}/{total}</span>
        </div>
        <div className="h-1 w-full bg-neutral rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-light to-primary-dark transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Only the remaining steps — completed ones collapse away */}
      <div className="divide-y divide-neutral border-t border-neutral">
        {remaining.map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.id}
              onClick={() => navigate(step.route)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-neutral/40 transition-colors group"
            >
              <span className="w-7 h-7 rounded-lg bg-neutral border border-neutral-dark flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-secondary-dark/70" />
              </span>
              <span className="flex-1 text-sm font-medium text-black">{step.title}</span>
              <ChevronRight className="w-4 h-4 text-secondary-dark/40 group-hover:text-primary-light group-hover:translate-x-0.5 transition-all" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
