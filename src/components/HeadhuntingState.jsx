import { useEffect, useState } from'react';
//`motion` is used only as`<motion.div>` (member-expression JSX), which this
// eslint config's jsx-uses-vars doesn't count — silence the false positive.
import { motion } from'framer-motion'; // eslint-disable-line no-unused-vars
import { Radar, Search, FileText, Sparkles } from'lucide-react';

/**
 *"Your AI headhunter is searching" — shown after onboarding while the initial
 * scrape runs in the background, so the user sees that something is happening
 * instead of a blank"check back tomorrow" screen.
 *
 * The stage line prefers the REAL pipeline phase (`scrape_status.phase`, set
 * server-side by _set_scrape_phase) when the parent passes one. Without it we
 * fall back to the decorative rotation below, which is honest about the sources
 * but not about where the run actually is.
 */

const STAGES = [
 { icon: Search, text:'Scanning LinkedIn, Greenhouse, Indeed & more…' },
 { icon: Radar, text:'Pulling fresh roles that match your titles…' },
 { icon: FileText, text:'Reading your CV to judge each role…' },
 { icon: Sparkles, text:'Scoring fit and picking the strongest matches…' },
];

// The backend's two real phases. Anything else (missing, unknown) → rotation.
const PHASE_STAGES = {
 scraping: { icon: Search, text:'Scanning job boards for roles that match you…' },
 scoring: { icon: FileText, text:'Reading each role against your CV…' },
};

// A first run is five serial phases including two Apify actor runs; the backend
// only presumes a run dead at 15 min. Past this point, say so rather than let a
// working run look stuck.
const LONG_RUN_MS = 5 * 60 * 1000;

export default function HeadhuntingState({ compact = false, phase = null }) {
 const [i, setI] = useState(0);
 const [longRun, setLongRun] = useState(false);

 // Stable module-level reference, so this is a safe effect dependency.
 const known = PHASE_STAGES[phase] || null;

 // The rotation is a stand-in for real progress — it only runs while we don't
 // have any.
 useEffect(() => {
 if (known) return undefined;
 const id = setInterval(() => setI((n) => (n + 1) % STAGES.length), 2200);
 return () => clearInterval(id);
 }, [known]);

 useEffect(() => {
 const id = setTimeout(() => setLongRun(true), LONG_RUN_MS);
 return () => clearTimeout(id);
 }, []);

 const stage = known || STAGES[i];
 const Stage = stage.icon;

 return (
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.5, ease:'easeOut' }}
 className={`flex flex-col items-center justify-center text-center ${compact ?'py-8' :'min-h-[45vh] py-10'}`}
 >
 {/* Pulsing radar */}
 <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
 <span className="absolute inset-0 rounded-full bg-primary-light/20 animate-ping" />
 <span className="absolute inset-3 rounded-full bg-primary-light/10 animate-ping [animation-delay:700ms]" />
 <span className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center shadow-lg shadow-primary-light/30">
 <Radar className="w-8 h-8 text-white animate-spin [animation-duration:4s]" />
 </span>
 </div>

 <h2 className="text-lg md:text-2xl font-bold text-black-light">
 Your AI headhunter is searching…
 </h2>

 {/* Live stage — the real phase when we have it, else the rotation. Keyed
 so scraping → scoring cross-fades in place instead of snapping. */}
 <motion.div
 key={known ? phase : i}
 initial={{ opacity: 0, y: 6 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.2 }}
 className="mt-3 flex items-center gap-2 text-sm md:text-base text-primary-dark font-medium"
 >
 <Stage className="w-4 h-4 shrink-0" />
 <span>{stage.text}</span>
 </motion.div>

 <p className="mt-4 text-xs md:text-sm text-secondary-dark max-w-sm leading-relaxed">
 Your first search takes a few minutes — we're checking dozens of sources.
 This keeps running whether or not you stay, and your matches will appear
 right here.
 </p>

 {longRun && (
 <motion.p
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ duration: 0.2 }}
 className="mt-2 text-xs text-secondary-dark"
 >
 Still going — first searches take the longest.
 </motion.p>
 )}

 {/* Indeterminate progress bar */}
 <div className="mt-6 w-56 h-1.5 rounded-full bg-neutral-dark overflow-hidden">
 <motion.div
 className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary-light to-primary-dark"
 animate={{ x: ['-100%','340%'] }}
 transition={{ duration: 1.6, repeat: Infinity, ease:'easeInOut' }}
 />
 </div>
 </motion.div>
 );
}
