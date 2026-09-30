import api from "../api";
import { parseApiError } from "./apiUtils";

// ---------------------------------------------------------------------------
// Jobs Page (scraped jobs)
// ---------------------------------------------------------------------------

export async function getScrapedJobs() {
  try {
    const response = await api.get("/api/jobs/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * Count of jobs at a given status, WITHOUT downloading the list.
 * The Home dashboard only needs "how many opportunities are waiting" — pulling
 * the entire (fully-serialised) jobs list just to call .length on it is what
 * made the dashboard hang for accounts with lots of data. This asks the
 * paginated endpoint for a single row and reads total_count.
 */
export async function getJobCount(status = 'scraped') {
  try {
    const response = await api.get("/api/jobs/", {
      params: { status, page: 1, limit: 1 },
    });
    return response.data?.total_count ?? 0;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * Full detail for ONE job — includes the description, extracted contacts
 * (ranked), and post-approval state (has_real_contact / has_draft /
 * primary_contact). Powers the Opportunities detail drawer and the
 * "stays-in-place" card polling after Write Intro.
 */
export async function getJob(id) {
  try {
    const response = await api.get(`/api/jobs/${id}/`);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * Page-based fetch for the Jobs dashboard.
 * Returns { jobs, total_count, total_pages, page }
 * Hits /api/jobs/?page=N&limit=10 so the first slice arrives immediately
 * without waiting for the full job list to be fetched and serialised.
 */
export async function getJobsPage(page = 1, filterTab = 'All', limit = 10) {
  try {
    const params = { page, limit };
    if (filterTab && filterTab !== 'All') {
      params.status = filterTab.toLowerCase().replace(/ /g, '_');
    }
    const response = await api.get("/api/jobs/", { params });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * @deprecated Use getJobsPage for the Jobs dashboard.
 * Kept for any legacy callers; cursor-based path is still supported by the backend.
 */
export async function getJobsStream(cursor = null, filterTab = 'All') {
  try {
    const params = { limit: 25 };
    if (cursor != null) params.cursor = cursor;
    if (filterTab && filterTab !== 'All') {
      params.status = filterTab.toLowerCase().replace(/ /g, '_');
    }
    const response = await api.get("/api/jobs/stream/", { params });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * The Opportunities feed. Returns jobs across the whole "to review / in
 * progress" span so a card never disappears when its status advances —
 * scraped → approved → contacted all stay on the page (and manual_apply for
 * the "Apply Direct" branch). Visual state per card is derived client-side.
 *
 * The server paginates at ≤100/page, but a user's review queue can exceed that
 * (Testimony had 104 scraped). Fetching a single 60-page silently HID the rest —
 * the "52 waiting" badge undercounted vs Home's 104, and those jobs were
 * unreachable. So we page THROUGH the whole queue (up to `maxJobs`) and return
 * the full array plus the server's true `total_count`, so the page shows and
 * counts everything.
 */
const OPPORTUNITY_STATUSES = "scraped,approved,outreach_automated,contacted,manual_apply";
const _OPP_PAGE_SIZE = 50;   // smaller pages serialize + transfer faster; server caps at 100

export async function getOpportunityJobs(maxJobs = 200) {
  try {
    const first = await api.get("/api/jobs/", {
      params: { page: 1, limit: _OPP_PAGE_SIZE, status: OPPORTUNITY_STATUSES },
    });
    const data = first.data || {};
    let jobs = Array.isArray(data.jobs) ? data.jobs : [];
    const totalCount = data.total_count ?? jobs.length;
    const totalPages = data.total_pages ?? 1;
    // Matches that exist but are not on screen yet (release valve). Read from
    // page 1 only — every page carries the same value, and an older backend
    // that predates the field yields 0 rather than NaN.
    const heldCount = data.held_count ?? 0;

    // Fetch the remaining pages (bounded by maxJobs) IN PARALLEL. The old
    // sequential loop waited for each page in turn — the main reason the
    // Opportunities page took many seconds to appear.
    const lastPage = Math.min(totalPages, Math.ceil(maxJobs / _OPP_PAGE_SIZE));
    if (lastPage >= 2) {
      const requests = [];
      for (let page = 2; page <= lastPage; page += 1) {
        requests.push(
          api.get("/api/jobs/", {
            params: { page, limit: _OPP_PAGE_SIZE, status: OPPORTUNITY_STATUSES },
          }),
        );
      }
      const results = await Promise.all(requests);
      for (const resp of results) {
        const more = Array.isArray(resp.data?.jobs) ? resp.data.jobs : [];
        jobs = jobs.concat(more);
      }
    }

    return { jobs, total_count: totalCount, total_pages: totalPages, held_count: heldCount };
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function getManualApplyJobs() {
  try {
    const response = await api.get("/api/jobs/?status=manual_apply");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function getApprovedJobs() {
  try {
    const response = await api.get("/api/jobs/?status=approved");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function scoreAllJobs() {
  try {
    const response = await api.post("/api/jobs/score/all/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * Move a job to a new status. `outreachNote` is the user's optional note about
 * THIS company from the Reach Out modal — stored on the job so the auto-draft
 * thread can hand it to the generator as `highlight`. Omitted when empty so an
 * ordinary skip/approve sends exactly the payload it always did.
 */
/**
 * Try a failed intro draft again for a job whose contact was found.
 * Generation only — the backend never re-runs contact discovery. Resolves with
 * the card payload (draft_failure_reason: 'retrying'); the outcome arrives on a
 * later poll. Rejections carry the server's own message (cooldown, daily cap…).
 */
export async function retryDraft(id) {
  try {
    const response = await api.post(`/api/jobs/${id}/retry-draft/`);
    return response.data;
  } catch (err) {
    // The per-user hourly throttle is DRF's own and answers with a bare
    // "Request was throttled" detail; every other refusal has a readable error.
    if (err.response?.status === 429 && !err.response?.data?.code) {
      throw new Error("You've retried a lot of intros in the last hour. Try again later.");
    }
    throw new Error(parseApiError(err));
  }
}

export async function updateJobStatus(id, status, outreachNote = '') {
  try {
    const body = { status };
    if (outreachNote && outreachNote.trim()) body.outreach_note = outreachNote.trim();
    const response = await api.patch(`/api/jobs/${id}/status/`, body);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function trackJob(jobId, status) {
  try {
    const body = status ? { status } : {};
    const response = await api.post(`/api/jobs/${jobId}/track/`, body);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function scrapeLinkedinJobs({ keywords, locations, time_range, count }) {
  try {
    const response = await api.post("/api/jobs/scrape/linkedin/", {
      keywords,
      locations,
      time_range,
      count: parseInt(count),
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function scrapeRemoteJobs(keywords) {
  try {
    const response = await api.post("/api/jobs/scrape/remote/", { keywords });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function scrapeApifyJobs({ search_url, count }) {
  try {
    const response = await api.post("/api/jobs/scrape/apify/", {
      search_url,
      count: parseInt(count),
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function scrapeAtsJobs(urls) {
  try {
    const response = await api.post("/api/jobs/scrape/ats/", { urls });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function autoScrapeAts({ title, location }) {
  try {
    const response = await api.post("/api/jobs/scrape/ats/auto/", { title, location });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function scrapeYcJobs({ keywords, location }) {
  try {
    const response = await api.post("/api/jobs/scrape/yc/", { keywords, location });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function scrapeWellfoundJobs({ keywords, location }) {
  try {
    const response = await api.post("/api/jobs/scrape/wellfound/", { keywords, location });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * Poll whether a background scrape thread is still running for the current user.
 * Returns { is_active: boolean } — true while the lock is held, false once the
 * thread finishes (or the 5-minute TTL safety net fires).
 */
export async function getScrapeStatus() {
  try {
    const response = await api.get("/api/jobs/scrape/status/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * Run this user's search NOW instead of waiting for the overnight pass.
 *
 * Never throws on contention or unavailability — the server answers those with
 * 200 + a flag, because "already working" and "not right now" are normal
 * outcomes for a button, not failures:
 *   { already_running: true }  → a run was already in flight; nothing started
 *   { unavailable: true }      → searching is paused platform-side
 * plus the usual scrape-status fields (is_active, phase, stale, first_run_*).
 * A real failure (403 out of quota, network) still rejects.
 */
export async function searchNow() {
  try {
    const response = await api.post("/api/jobs/search-now/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function saveJobDescription(jobId, description) {
  try {
    const response = await api.post(`/api/jobs/${jobId}/refresh-description/`, { description });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * "Your headhunter will also look for…" — same-niche job titles for a
 * custom-typed keyword. Backend caches cross-user, so repeats are instant.
 */
export async function expandKeyword(keyword) {
  try {
    const response = await api.post("/api/jobs/keywords/expand/", { keyword });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}
