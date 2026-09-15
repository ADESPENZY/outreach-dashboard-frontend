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

// Why a found contact has no intro. Blank reason = a legacy row flipped to
// manual_apply before the reason was recorded.
const DRAFT_FAILURE_COPY = {
    below_fit_floor: 'this role is below your fit threshold',
    generation_failed: "we couldn't draft the intro",
};

export const draftFailureText = (job) =>
    DRAFT_FAILURE_COPY[job.draft_failure_reason] || "the intro wasn't drafted";
