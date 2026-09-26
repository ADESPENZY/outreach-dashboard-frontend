// Formatting helpers shared across the Progress panels.
// All moved unchanged from the original single-file ProgressPage.

export function timeAgo(iso) {
  if (!iso) return '';
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 90) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export function gmailSearchUrl(contactEmail) {
  return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(`to:${contactEmail} OR from:${contactEmail}`)}`;
}

export function pctChange(now, before) {
  if (before > 0) return Math.round(((now - before) / before) * 100);
  return null;
}

/**
 * Build a local Date from the DATE PART of a server timestamp.
 *
 * The server sends week boundaries in the USER's timezone
 * ("2026-09-21T00:00:00+01:00"). Passing that to `new Date()` and reading
 * getDate() re-renders it in the BROWSER's timezone, which shifts the label by
 * a day whenever the two disagree — the user would see a week starting Sunday.
 * Reading the Y-M-D characters keeps the date the server meant.
 */
function ymdToLocalDate(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "Sep 21–27", or "Sep 29 – Oct 5" when the week straddles two months. */
export function formatWeekRange(startIso, endIso) {
  if (!startIso || !endIso) return '';
  const start = ymdToLocalDate(startIso);
  // `end` is exclusive (the next Monday), so the last day shown is end − 1.
  const end = ymdToLocalDate(endIso);
  end.setDate(end.getDate() - 1);

  const month = (d) => d.toLocaleDateString(undefined, { month: 'short' });
  if (start.getMonth() === end.getMonth()) {
    return `${month(start)} ${start.getDate()}–${end.getDate()}`;
  }
  return `${month(start)} ${start.getDate()} – ${month(end)} ${end.getDate()}`;
}
