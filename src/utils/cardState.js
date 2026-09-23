// Visual lifecycle state of an Opportunities card, derived from server status +
// contact/draft/queue flags:
//   new              → scraped, undecided → Skip / Write Intro
//   working          → approved, finding a contact + drafting in the background
//   queued           → approved but 3 already in flight → waiting its turn
//   drafted          → real contact + draft ready → lives on Introductions
//   contact_no_draft → we found a person, but no intro was drafted (drafting
//                      failed, or the role is below the fit floor)
//   no_contact       → nobody to email → Apply Direct
//   sent             → contacted/outreach_automated
//
// Kept free of React so it can be tested with `node --test`.

// has_live_contact excludes contacts that have since gone; older payloads only
// carry has_real_contact.
const hasLiveContact = (job) => (job.has_live_contact ?? job.has_real_contact) === true;

export const cardState = (job) => {
    if (job.status === 'contacted' || job.status === 'outreach_automated') return 'sent';
    if (job.has_draft && job.has_real_contact) return 'drafted';
    // A contact we found is shown whatever happened to the draft. This MUST come
    // before the manual_apply check: jobs used to be flipped to manual_apply when
    // only the draft failed, and those cards read "No hiring manager found" with
    // a named Head of Engineering on file.
    if (hasLiveContact(job) && !job.has_draft
        && (job.draft_failed_at || job.status === 'manual_apply')) return 'contact_no_draft';
    if (job.status === 'manual_apply' || (job.has_draft && !job.has_real_contact)) return 'no_contact';
    if (job.status === 'approved' && job.is_queued) return 'queued';
    if (job.status === 'approved' && !job.has_draft) return 'working';
    return 'new';
};

// A 'working' card is really two phases, and the payload already tells them
// apart: once a live contact exists but no draft does, the person has been found
// and the intro is being written. No new field, no backend change.
export const workingStage = (job) => (hasLiveContact(job) ? 'writing' : 'finding');

// The only two labels a working card may show. Plain English on purpose: the
// user never sees an internal stage name.
export const WORKING_LABEL = {
    finding: 'Finding the hiring manager…',
    writing: 'Writing your introduction…',
};

// Why a found contact has no intro. Blank reason = a legacy row flipped to
// manual_apply before the reason was recorded.
const DRAFT_FAILURE_COPY = {
    below_fit_floor: 'this role is below your fit threshold',
    generation_failed: "we couldn't draft the intro",
    retrying: 'retrying the intro now',
};

export const draftFailureText = (job) =>
    DRAFT_FAILURE_COPY[job.draft_failure_reason] || "the intro wasn't drafted";

// A retry is in flight (POST /api/jobs/<id>/retry-draft/ was accepted).
export const isRetryingDraft = (job) => job.draft_failure_reason === 'retrying';

// "Try again" is offered on a found contact whose intro failed to draft. Not while
// a retry is running, and not below the fit floor, where no retry can succeed.
export const canRetryDraft = (job) =>
    cardState(job) === 'contact_no_draft'
    && !isRetryingDraft(job)
    && job.draft_failure_reason !== 'below_fit_floor';
