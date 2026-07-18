import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Radar, Search, FileText, Sparkles } from 'lucide-react';

/**
 * "Your AI headhunter is searching" — shown after onboarding while the initial
 * scrape runs in the background, so the user sees that something is happening
 * instead of a blank "check back tomorrow" screen. Rotates through the real
 * pipeline stages so it feels alive and honest about what's going on.
 */

const STAGES = [
  { icon: Search,   text: 'Scanning LinkedIn, Greenhouse, Indeed & more…' },
  { icon: Radar,    text: 'Pulling fresh roles that match your titles…' },
  { icon: FileText, text: 'Reading your CV to judge each role…' },
  { icon: Sparkles, text: 'Scoring fit and picking the strongest matches…' },
];

export default function HeadhuntingState({ compact = false }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % STAGES.length), 2200);
    return () => clearInterval(id);
  }, []);

  const Stage = STAGES[i].icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'min-h-[45vh] py-10'}`}
    >
      {/* Pulsing radar */}
      <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-primary-light/20 animate-ping" />
        <span className="absolute inset-3 rounded-full bg-primary-light/10 animate-ping [animation-delay:700ms]" />
        <span className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center shadow-lg shadow-primary-light/30">
          <Radar className="w-8 h-8 text-white animate-spin [animation-duration:4s]" />
        </span>
      </div>

      <h2 className="text-lg md:text-2xl font-bold font-montserrat text-black-light">
        Your AI headhunter is searching…
      </h2>

      {/* Rotating live stage */}
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mt-3 flex items-center gap-2 text-sm md:text-base text-primary-dark font-medium"
      >
        <Stage className="w-4 h-4 shrink-0" />
        <span>{STAGES[i].text}</span>
      </motion.div>

      <p className="mt-4 text-xs md:text-sm text-secondary-dark max-w-sm leading-relaxed">
        This usually takes a minute or two. You can leave this page — we'll keep
        working and your matches will appear here the moment they're ready.
      </p>

      {/* Indeterminate progress bar */}
      <div className="mt-6 w-56 h-1.5 rounded-full bg-neutral-dark overflow-hidden">
        <motion.div
          className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary-light to-primary-dark"
          animate={{ x: ['-100%', '340%'] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  );
}
