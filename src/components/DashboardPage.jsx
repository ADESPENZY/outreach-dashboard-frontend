import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Zap, ArrowRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getScrapedJobs } from '../services/apiJobs';
import InboxOverview from './InboxOverview';
import AnalyticsDashboardOverview from './AnalyticsDashboardOverview';

const TOUR_KEY = 'applydirTourDone';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: getScrapedJobs,
  });

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!jobsLoading && jobs.length === 0 && localStorage.getItem(TOUR_KEY) !== 'true') {
      setShowModal(true);
    }
  }, [jobsLoading, jobs.length]);

  const dismissModal = () => {
    localStorage.setItem(TOUR_KEY, 'true');
    setShowModal(false);
  };

  const handleLaunchScraper = () => {
    setShowModal(false);
    navigate('/dashboard/jobs?tour=1');
  };

  const firstName = currentUser?.first_name || currentUser?.username || 'there';

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-8 animate-fade-in font-roboto">

      {/* Dashboard content always visible underneath */}
      <InboxOverview />
      <AnalyticsDashboardOverview />

      {/* ── Orientation Overlay Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            key="orientation-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative w-full max-w-lg"
            >
              {/* Ambient glow layer */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary-light/25 to-primary-dark/25 rounded-3xl blur-2xl scale-105 pointer-events-none" />

              <div className="relative bg-white border border-neutral-dark rounded-3xl p-8 shadow-2xl text-center space-y-6">

                {/* Dismiss */}
                <button
                  onClick={dismissModal}
                  className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Step badge */}
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary-light/10 text-primary-dark text-[11px] font-bold uppercase tracking-wider border border-primary-light/20">
                  Step 1 of 2 · Quick Setup
                </span>

                {/* Icon */}
                <div className="flex items-center justify-center mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-light to-primary-dark shadow-lg shadow-primary-light/30">
                  <Briefcase className="w-8 h-8 text-white" />
                </div>

                {/* Heading + subtext */}
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900 font-montserrat">
                    Welcome, {firstName}!
                  </h2>
                  <p className="text-sm text-secondary-dark leading-relaxed">
                    Your job board is empty. Let Auto-Scout hunt your next opportunity across
                    LinkedIn, Remote boards, ATS listings, and custom URLs — all AI-scored
                    against your CV in real time.
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

                {/* Primary CTA */}
                <button
                  onClick={handleLaunchScraper}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-primary-light to-primary-dark text-white font-bold text-sm rounded-2xl shadow-lg shadow-primary-light/30 hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  <Zap className="w-4 h-4" />
                  Launch Job Scraper
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-xs text-secondary-dark/60">
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
