import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Sparkles } from 'lucide-react';
import { RISE } from '../animations';

// Moved unchanged from the original single-file ProgressPage.

function StrategyBar({ s, isBest, maxRate, index }) {
  const width = Math.max((s.reply_rate / maxRate) * 100, s.reply_rate > 0 ? 6 : 2);
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <p className="text-sm font-semibold text-black-light truncate flex items-center gap-1.5 min-w-0">
          {isBest && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />}
          <span className="truncate">{s.label}</span>
        </p>
        <p className="text-sm font-bold text-black font-montserrat shrink-0 tabular-nums">
          {s.reply_rate}%
        </p>
      </div>
      <div className="h-2.5 rounded-full bg-neutral overflow-hidden" aria-hidden="true">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.7, delay: 0.2 + index * 0.09, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-full ${isBest ? 'bg-gradient-to-r from-primary-light to-primary-dark' : 'bg-secondary-dark/25'}`}
        />
      </div>
      <p className="text-xs text-secondary-dark mt-1">
        {s.sent} sent · {s.replied} replied
      </p>
    </li>
  );
}

export default function StrategyPerformance({ strategies }) {
  const withSends = strategies
    .filter((s) => s.sent > 0)
    .sort((a, b) => b.reply_rate - a.reply_rate || b.sent - a.sent);
  const totalSent = withSends.reduce((n, s) => n + s.sent, 0);
  const maxRate = Math.max(...withSends.map((s) => s.reply_rate), 1);
  const best = withSends[0];

  return (
    <motion.section variants={RISE} className="bg-white rounded-2xl border border-neutral-dark shadow-sm">
      <div className="px-4 md:px-6 py-5 border-b border-neutral-dark">
        <h2 className="text-base font-bold text-black-light font-montserrat">Strongest strategies</h2>
        <p className="text-xs text-secondary-dark mt-0.5">
          Each introduction takes a different approach — replies decide the winner.
        </p>
      </div>

      <div className="px-4 md:px-6 py-5">
        {withSends.length === 0 ? (
          <p className="text-sm text-secondary-dark py-4 text-center">
            Send your first introductions and the comparison fills in here.
          </p>
        ) : (
          <ul className="space-y-4">
            {withSends.map((s, i) => (
              <StrategyBar key={s.strategy} s={s} isBest={i === 0 && s.reply_rate > 0} maxRate={maxRate} index={i} />
            ))}
          </ul>
        )}

        <div className="mt-5 pt-4 border-t border-neutral-dark flex items-start gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-primary-light/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-primary-dark" aria-hidden="true" />
          </span>
          <p className="text-sm text-secondary-dark leading-relaxed">
            {totalSent >= 20 && best && best.reply_rate > 0 ? (
              <>Your headhunter is using <strong className="font-semibold text-black-light">“{best.label}”</strong> more often — it's getting the best results.</>
            ) : (
              <>Send more introductions to see which strategy works best for you. Your headhunter is testing different approaches.</>
            )}
          </p>
        </div>
      </div>
    </motion.section>
  );
}
