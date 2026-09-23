// The "your introduction is ready" copy, in one place.
//
// Two pages announce the same event: Opportunities (where Reach Out was tapped)
// and Introductions (where the draft lands). The user may be on either when it
// happens, so both toast — and they must say exactly the same thing.
//
// Kept free of React so it can be tested with `node --test`.

/** "Lauren Shuler" -> "Lauren". Safe on null, empty and single-word names. */
export const firstNameOf = (fullName) => (fullName || '').trim().split(/\s+/)[0] || '';

/** The success toast. Falls back to a nameless sentence rather than a blank. */
export const introReadyText = (firstName) => (firstName
    ? `Your introduction to ${firstName} is ready to review.`
    : 'Your introduction is ready to review.');
