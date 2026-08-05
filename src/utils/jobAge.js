// Shared job-age formatting. Used by the Opportunities date chip and the
// Introductions review cards, so the two pages can never drift apart on how old
// they claim a posting is. (Moved out of JobsPage.jsx, which was its only home.)
//
// posted_at is the employer's own posting date but is absent on ~59% of rows
// (LinkedIn/Workday/Indeed never supply one), so we fall back to created_at —
// when WE found it — under a DIFFERENT VERB rather than passing a scrape date off
// as a posting date. That verb is the whole point: "Posted 50d ago" is a fact
// about the employer, "Found 50d ago" is a fact about us.
//
// posted_at is a DATE (no time component); created_at is a full timestamp.

// Mirrors RECENCY_DROP_DAYS in Backend/jobs/services.py. Beyond this an opening is
// old enough that the ingest gate would now refuse it, so the UI flags it. Keep
// the two in step.
export const STALE_AFTER_DAYS = 30;

// Past this many days, express age as a raw day count rather than weeks. "83
// weeks ago" and "Dec 26" both hide the magnitude that makes a stale draft
// obvious; "587d ago" does not.
const RAW_DAYS_AFTER = 28;

/**
 * @param {{posted_at?: string|null, created_at?: string|null}} job
 * @returns {{verb: string, label: string, short: string, chip: string,
 *            days: number|null, isFresh: boolean, isStale: boolean}}
 *   verb    'Posted' | 'Found' | ''
 *   label   full phrase for a roomy surface — "Posted 587d ago"
 *   short   compact form for a chip — "587d"
 *   chip    verb + short — "Posted 587d"
 *   days    whole days elapsed, or null when no date at all
 *   isFresh posted within a day. NEVER true on the created_at fallback: a
 *           month-old job scraped today is not a fresh posting.
 *   isStale older than STALE_AFTER_DAYS, on either branch
 */
export const postedAge = (job) => {
    const none = { verb: '', label: '', short: '', chip: '', days: null, isFresh: false, isStale: false };
    if (!job) return none;

    const build = (verb, days, short, phrase, isFresh) => ({
        verb,
        label: `${verb} ${phrase}`,
        short,
        chip: `${verb} ${short}`,
        days,
        isFresh,
        isStale: days > STALE_AFTER_DAYS,
    });

    if (job.posted_at) {
        const d = new Date(`${job.posted_at}T00:00:00`);
        if (Number.isNaN(d.getTime())) return none;
        const days = Math.floor((Date.now() - d.getTime()) / 86400000);
        if (days <= 0) return build('Posted', 0, 'today', 'today', true);
        if (days === 1) return build('Posted', 1, '1d', 'yesterday', true);
        if (days < 7) return build('Posted', days, `${days}d`, `${days} days ago`, false);
        if (days < RAW_DAYS_AFTER) {
            const weeks = Math.floor(days / 7);
            return build('Posted', days, `${weeks}w`, `${weeks} week${weeks === 1 ? '' : 's'} ago`, false);
        }
        return build('Posted', days, `${days}d`, `${days}d ago`, false);
    }

    if (!job.created_at) return none;
    const d = new Date(job.created_at);
    if (Number.isNaN(d.getTime())) return none;
    const hours = Math.floor(Math.max(0, Date.now() - d.getTime()) / 3600000);
    const days = Math.floor(hours / 24);
    if (hours < 1) return build('Found', 0, 'now', 'just now', false);
    if (hours < 24) return build('Found', 0, `${hours}h`, `${hours} hour${hours === 1 ? '' : 's'} ago`, false);
    if (days < 7) return build('Found', days, `${days}d`, `${days} day${days === 1 ? '' : 's'} ago`, false);
    if (days < RAW_DAYS_AFTER) {
        const weeks = Math.floor(days / 7);
        return build('Found', days, `${weeks}w`, `${weeks} week${weeks === 1 ? '' : 's'} ago`, false);
    }
    return build('Found', days, `${days}d`, `${days}d ago`, false);
};
