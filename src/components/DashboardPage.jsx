import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Target, Lock, Zap, ArrowRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getScrapedJobs } from '../services/apiJobs';
import InboxOverview from './InboxOverview';
import AnalyticsDashboardOverview from './AnalyticsDashboardOverview';
import SetupChecklist from './SetupChecklist';
import PipelineStepper from './PipelineStepper';

const BULLETS = [
  { Icon: Target, text: 'Every role is AI-scored against your CV' },
  { Icon: Zap,    text: 'Scrape one source at a time — LinkedIn, a remote board, an ATS, or any URL' },
  { Icon: Lock,   text: 'Outreach sends from your own inbox for the best deliverability' },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const tourKey = `applydirTourDone_${currentUser?.id ?? currentUser?.username ?? 'anon'}`;

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: getScrapedJobs,
  });

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (currentUser && !jobsLoading && jobs.length === 0 && localStorage.getItem(tourKey) !== 'true') {
      setShowModal(true);
    }
  }, [currentUser, jobsLoading, jobs.length, tourKey]);

  const dismissModal = () => {
    localStorage.setItem(tourKey, 'true');
    setShowModal(false);
  };

  const handleLaunchScraper = () => {
    setShowModal(false);
    navigate('/dashboard/jobs?tour=1');
  };

  const firstName = currentUser?.first_name || currentUser?.username || 'there';

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-8 animate-fade-in font-roboto">

      {/* Whole-journey map — where the user is across the 5 stages */}
      <PipelineStepper />

      {/* Compact setup card — sits top-right, shrinks as steps complete, vanishes when done */}
      <div className="flex justify-end -mb-4">
        <SetupChecklist />
      </div>

      <InboxOverview />
      <AnalyticsDashboardOverview />

      {/* ── Welcome Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            key="welcome-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.94 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: 28, scale: 0.94 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.09] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.75)]"
              style={{ background: 'linear-gradient(160deg, #0F1019 0%, #0B0C10 100%)' }}
            >
              {/* Ambient glow */}
              <div
                className="absolute -top-24 -right-24 w-60 h-60 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(255,91,46,0.18) 0%, transparent 70%)', filter: 'blur(50px)' }}
              />

              {/* Close */}
              <button
                onClick={dismissModal}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-all z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="px-8 pt-8 pb-8 relative z-10 space-y-6">

                {/* Step track */}
                <div className="flex gap-1.5">
                  <div
                    className="h-[3px] w-10 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #B82E07, #FF5B2E)' }}
                  />
                  <div className="h-[3px] flex-1 rounded-full bg-white/[0.07]" />
                </div>

                {/* Icon */}
                <motion.div
                  initial={{ scale: 0.75, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 280, damping: 22 }}
                  className="flex items-center justify-center w-14 h-14 rounded-2xl mx-auto"
                  style={{
                    background: 'linear-gradient(135deg, rgba(184,46,7,0.25) 0%, rgba(255,91,46,0.12) 100%)',
                    border: '1px solid rgba(255,91,46,0.22)',
                  }}
                >
                  <Rocket className="w-7 h-7" style={{ color: '#FF5B2E' }} />
                </motion.div>

                {/* Heading */}
                <div className="text-center space-y-2.5">
                  <p className="text-[rgba(255,255,255,0.30)] font-montserrat text-[10px] tracking-[0.2em] uppercase">
                    Welcome aboard
                  </p>
                  <h2 className="text-[1.6rem] font-bold text-white font-montserrat leading-snug">
                    Ready to land your<br />next role, {firstName}?
                  </h2>
                  <p className="text-[rgba(255,255,255,0.42)] text-sm font-roboto leading-relaxed">
                    Your job board is empty. Pick a source — LinkedIn, a remote board, an ATS,
                    or a custom URL — and ApplyDir pulls in the latest roles, then scores each
                    one against your CV.
                  </p>
                </div>

                {/* Feature rows */}
                <div className="space-y-2">
                  {BULLETS.map(({ Icon, text }, i) => (
                    <motion.div
                      key={text}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.18 + i * 0.07, duration: 0.35 }}
                      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(255,91,46,0.12)', border: '1px solid rgba(255,91,46,0.18)' }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: '#FF5B2E' }} />
                      </div>
                      <span className="text-[rgba(255,255,255,0.62)] text-sm font-roboto">{text}</span>
                    </motion.div>
                  ))}
                </div>

                {/* CTA */}
                <motion.button
                  onClick={handleLaunchScraper}
                  whileHover={{ y: -1, boxShadow: '0 0 24px rgba(255,91,46,0.38), 0 0 48px rgba(184,46,7,0.22)' }}
                  whileTap={{ y: 0, scale: 0.98, boxShadow: 'none' }}
                  className="group w-full flex items-center justify-center gap-2.5 py-3.5 text-white font-montserrat font-semibold text-sm rounded-xl transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #B82E07 0%, #FF5B2E 100%)' }}
                >
                  <Zap className="w-4 h-4" />
                  Launch Job Scraper
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                </motion.button>

                <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.18)' }}>
                  You can always start a new scrape from the Jobs page.
                </p>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardPage;
