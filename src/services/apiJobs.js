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

export async function trackJob(jobId) {
  try {
    const response = await api.post(`/api/jobs/${jobId}/track/`);
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
