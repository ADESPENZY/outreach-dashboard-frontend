import React from 'react';
import { BarChart3 } from 'lucide-react';

// Placeholder. Analytics, Job Tracker, and Inbox status will be merged into
// this page in a later phase (see ARCHITECTURE.md — the "Progress" page).
export default function ProgressPage() {
  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto animate-fade-in font-roboto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-black to-secondary-dark font-montserrat">
          Your Progress
        </h1>
        <p className="text-sm text-secondary-dark mt-1">
          Track your introductions, replies, and interviews — all in one place.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm px-6 py-16 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary-light/10 flex items-center justify-center mb-4">
          <BarChart3 className="w-6 h-6 text-primary-dark" />
        </div>
        <p className="text-base font-semibold text-black font-montserrat">Your progress will appear here</p>
        <p className="text-sm text-secondary-dark mt-1 max-w-sm">
          As your introductions go out and replies come in, you'll see your
          pipeline, reply rate, and interviews on this page.
        </p>
      </div>
    </div>
  );
}
