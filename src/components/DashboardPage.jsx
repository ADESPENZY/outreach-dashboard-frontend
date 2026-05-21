import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Zap, ArrowRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getScrapedJobs } from '../services/apiJobs';
import InboxOverview from './InboxOverview';
import AnalyticsDashboardOverview from './AnalyticsDashboardOverview';

const TOUR_KEY = 'applydirTourDone';

// ── Tour Tooltip ──────────────────────────────────────────────────────────────

function TourTooltip({ anchorRef, onDismiss, children }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!anchorRef?.current) return;
    const calc = () => {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.top - 8, left: r.left + r.width / 2 });
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [anchorRef]);

  if (!pos) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        transform: 'translate(-50%, -100%)',
        zIndex: 300,
        width: '18rem',
      }}
      className="pointer-events-auto"
    >
      <div className="relative bg-gray-900 text-white rounded-2xl shadow-2xl p-4 border border-white/10">
        {/* Downward caret pointing at the CTA button */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-gray-900" />
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        {children}
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const DashboardPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: getScrapedJobs,
  });

  const hasJobs = jobs.length > 0;
  const ctaRef = useRef(null);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (!jobsLoading && !hasJobs && localStorage.getItem(TOUR_KEY) !== 'true') {
      setShowTour(true);
    }
  }, [jobsLoading, hasJobs]);

  const dismissTour = () => {
    localStorage.setItem(TOUR_KEY, 'true');
    setShowTour(false);
  };

  const handleLaunchScraper = () => {
    if (showTour) {
      setShowTour(false);
      navigate('/dashboard/jobs?tour=1');
    } else {
      navigate('/dashboard/jobs');
    }
  };

  const firstName = currentUser?.first_name || currentUser?.username || 'there';

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-8 animate-fade-in font-roboto">

      <InboxOverview />

      {/* ── Centerpiece empty state ── */}
      {!jobsLoading && !hasJobs && (
        <section className="flex flex-col items-center justify-center py-12 px-4">
          <div className="relative max-w-lg w-full">
            {/* Ambient glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-light/20 to-primary-dark/20 rounded-3xl blur-2xl scale-105 pointer-events-none" />

            <div className="relative bg-white border border-neutral-dark rounded-3xl p-8 shadow-sm text-center space-y-6">
              {/* Icon */}
              <div className="flex items-center justify-center mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-light to-primary-dark shadow-lg shadow-primary-light/30">
                <Briefcase className="w-8 h-8 text-white" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 font-montserrat">Your job board is empty</h2>
                <p className="text-sm text-secondary-dark leading-relaxed">
                  Let Auto-Scout find your next opportunity. Scrape LinkedIn, Remote boards,
                  ATS listings, or custom URLs — all in one click.
                </p>
              </div>

              {/* Feature bullets */}
              <ul className="text-left space-y-2.5 border border-neutral-dark rounded-2xl p-4 bg-neutral/50">
                {[
                  { icon: '🎯', text: 'AI scores each role against your CV instantly' },
                  { icon: '⚡', text: 'Multi-channel: LinkedIn · Remote · ATS · Custom URL' },
                  { icon: '🔒', text: 'Outreach runs from your own inbox for max deliverability' },
                ].map(({ icon, text }) => (
                  <li key={text} className="flex items-start gap-2.5 text-sm text-secondary-dark">
                    <span className="shrink-0 text-base">{icon}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>

              {/* CTA — ref'd for tour tooltip anchor */}
              <button
                ref={ctaRef}
                onClick={handleLaunchScraper}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-primary-light to-primary-dark text-white font-bold text-sm rounded-2xl shadow-lg shadow-primary-light/30 hover:opacity-90 active:scale-[0.98] transition-all"
              >
                <Zap className="w-4 h-4" />
                Launch Job Scraper
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      <AnalyticsDashboardOverview />

      {/* ── Step 0 Tour Tooltip ── */}
      <AnimatePresence>
        {showTour && (
          <TourTooltip anchorRef={ctaRef} onDismiss={dismissTour}>
            <p className="text-[11px] font-bold text-primary-light uppercase tracking-wider mb-1.5">
              Step 1 of 2 · Quick Tour
            </p>
            <p className="text-sm leading-relaxed text-white/85 pr-4">
              Welcome to ApplyDIR,{' '}
              <span className="font-semibold text-white">{firstName}!</span>{' '}
              Let's get you your first interview leads. Click here to open the multi-channel scraper.
            </p>
          </TourTooltip>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardPage;
