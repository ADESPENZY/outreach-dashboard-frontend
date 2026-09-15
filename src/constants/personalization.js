// Shared personalization constants.
//
// TONES and DIFFERENTIATORS were duplicated verbatim in
// FirstTimePersonalizationModal.jsx and Settings.jsx, so the two could drift
// apart silently. One definition, imported by both.

export const TONES = [
  { id: 'direct',       label: 'Direct and confident',   example: 'I built X that does Y. Worth a conversation?' },
  { id: 'warm',         label: 'Warm and human',         example: 'Hey Sarah, noticed what your team is building…' },
  { id: 'professional', label: 'Professional and sharp', example: "I'm reaching out regarding the engineering role…" },
];

// FALLBACK ONLY — not the menu.
//
// These six are tech-shaped by history ("Fast learner with new stacks"), which
// is exactly the problem: a nurse or a sales lead was asked to describe herself
// in a developer's vocabulary. The real options are generated per user from
// their own CV and cached on profile.differentiator_options; this list is what
// we show when that generation has not run yet or failed.
//
// Mirrors FALLBACK_DIFFERENTIATORS in Backend/accounts/services.py — keep in step.
export const FALLBACK_DIFFERENTIATORS = [
  'Built and shipped my own products',
  'Strong across time zones',
  'Fast learner with new stacks',
  'Strong communicator and documenter',
  'Non-traditional background',
  'Deep domain expertise',
];

// Story answers and secret weapon. Matches SECRET_WEAPON_MAX_CHARS in the email
// generator and MAX_SECRET_WEAPON_CHARS in accounts.serializers. At 400 the box cut
// stories off mid-sentence, before the part that made them worth telling.
export const SECRET_WEAPON_MAX = 2000;
export const OUTREACH_NOTE_MAX = 300;   // matches the cap in jobs.views.job_patch_status
export const MAX_DIFFERENTIATORS = 2;

// Placeholder for "one thing you bring that isn't on your CV", keyed to the
// user's primary role category. Purely illustrative text — no API call, no
// generation. The engineering line is the default because it is what shipped.
const SECRET_WEAPON_EXAMPLES = {
  nursing:            'I stay calm when a ward gets loud. Families remember that.',
  caregiving:         'I notice the small changes in someone long before they show up in a chart.',
  healthcare_admin:   'I can read a room and a rota. Both matter when the schedule breaks.',
  sales:              "I'd rather lose a deal than oversell someone who'll churn.",
  marketing:          'I write like a person, not a brand guideline.',
  customer_support:   'I defuse angry before I troubleshoot broken.',
  finance_accounting: 'I find the question behind the number people actually asked.',
  hr_recruiting:      'I remember candidates as people, not pipeline.',
  education:          "I teach to the student in front of me, not the lesson plan.",
  operations_admin:   'I fix the process so the problem stops coming back.',
  designer:           'I care more about the second-time user than the first.',
  product_manager:    'I kill my own ideas early so the good ones get room.',
};

const DEFAULT_SECRET_WEAPON_EXAMPLE =
  'I think in systems, not just code. I ask why before I ask how.';

/** Example sentence for the secret-weapon textarea, from the user's first role type. */
export function secretWeaponPlaceholder(profile) {
  const roles = profile?.job_preferences?.role_types;
  const primary = Array.isArray(roles) && roles.length ? roles[0] : '';
  return SECRET_WEAPON_EXAMPLES[primary] || DEFAULT_SECRET_WEAPON_EXAMPLE;
}

// Depth-showing example answers for the three story questions. Concrete on
// purpose — they teach the user to write a specific story (a project with a
// scar, an invisible win, a reputation), not a one-line platitude.
export const STORY_PLACEHOLDERS = {
  built:
    'e.g. At FumiSync I built middleware syncing legacy dental systems to a CRM. One dropped webhook silently double-charged a clinic; I spent a night tracing it across three APIs before I found the missing retry.',
  proud:
    "e.g. Onboarding was quietly failing for users on slow connections and nobody had flagged it. I rebuilt it to resume where it dropped, and the support tickets stopped.",
  knownFor:
    'e.g. The one people hand the gnarly integration nobody else wants to touch.',
};

/** The chips to show: the user's CV-derived options, else the shared fallback. */
export function differentiatorOptions(profile) {
  const opts = profile?.differentiator_options;
  return Array.isArray(opts) && opts.length ? opts : FALLBACK_DIFFERENTIATORS;
}
