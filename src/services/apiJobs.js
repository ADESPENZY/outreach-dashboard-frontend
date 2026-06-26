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
 */
export async function getOpportunityJobs(limit = 60) {
  try {
    const response = await api.get("/api/jobs/", {
      params: {
        page: 1,
        limit,
        status: "scraped,approved,outreach_automated,contacted,manual_apply",
      },
    });
    return response.data;
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

export async function updateJobStatus(id, status) {
  try {
    const response = await api.patch(`/api/jobs/${id}/status/`, { status });
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

export async function saveJobDescription(jobId, description) {
  try {
    const response = await api.post(`/api/jobs/${jobId}/refresh-description/`, { description });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}
