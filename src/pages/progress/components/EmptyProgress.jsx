import React from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowRight } from 'lucide-react';

// Moved unchanged from the original single-file ProgressPage.

export default function EmptyProgress() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-white rounded-2xl border border-neutral-dark shadow-sm px-6 py-16 md:py-20 flex flex-col items-center text-center"
    >
      <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-primary-light/20 animate-ping" aria-hidden="true" />
        <span className="absolute inset-2 rounded-full bg-primary-light/10 animate-ping [animation-delay:600ms]" aria-hidden="true" />
        <span className="relative w-16 h-16 rounded-full bg-primary-light/10 border border-primary-light/30 flex items-center justify-center">
          <TrendingUp className="w-7 h-7 text-primary-light" aria-hidden="true" />
        </span>
      </div>
      <h2 className="text-lg md:text-xl font-bold text-black-light font-montserrat max-w-md leading-snug">
        Your progress starts with your first introduction.
      </h2>
      <p className="text-sm text-secondary-dark mt-3 max-w-md leading-relaxed">
        Head to Opportunities to find roles your headhunter matched for you, then approve an introduction.
      </p>
      <p className="text-sm text-secondary-dark mt-2 max-w-md leading-relaxed">
        Once sent, this page tracks every delivery, reply, and interview — so you can see exactly what's working.
      </p>
      <Link
        to="/dashboard/opportunities"
        className="group mt-7 inline-flex items-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-6 py-3 shadow-sm hover:opacity-90 hover:scale-105 hover:shadow-lg hover:shadow-primary-dark/40 active:scale-95 transition-all duration-300"
      >
        Go to Opportunities
        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
      </Link>
    </motion.div>
  );
}
