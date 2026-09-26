import api from "../api";
import { parseApiError } from "./apiUtils";

// ---------------------------------------------------------------------------
// Progress page — hero metrics, pipeline stages, activity timeline, momentum
// ---------------------------------------------------------------------------

/**
 * @param {number} weekOffset 0 = this week, -1 = last week, and so on. The
 * backend resolves it against the user's own timezone, so the caller never
 * does week arithmetic. Only the period-scoped numbers move with it; the
 * pipeline, streak and all-time blocks are the same at every offset.
 */
export async function getProgress(weekOffset = 0) {
  try {
    const response = await api.get("/api/outreach/progress/", {
      params: weekOffset ? { week_offset: weekOffset } : {},
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * Daily sent/replied buckets, in the user's timezone, gap-filled by the server.
 *
 * Both params are optional and omitting them is usually right: the server
 * defaults to the last 30 days ending TODAY in the user's own timezone, which
 * the browser cannot compute correctly when the two zones differ. Pass `start`
 * alone to widen the window while leaving that near edge server-resolved.
 *
 * @param {{start?: string, end?: string}} params YYYY-MM-DD
 */
export async function getProgressSeries({ start, end } = {}) {
  try {
    const params = {};
    if (start) params.start = start;
    if (end) params.end = end;
    const response = await api.get("/api/outreach/progress/series/", { params });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function getProgressTimeline(before) {
  try {
    const response = await api.get("/api/outreach/progress/timeline/", {
      params: before ? { before } : {},
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * Click-to-advance replacement for the kanban drag — moves a company's
 * tracker card forward (interview / offer), never backward.
 */
export async function advanceStage({ stage, trackerJobId, scrapedJobId }) {
  try {
    const response = await api.post("/api/outreach/progress/advance/", {
      stage,
      tracker_job_id: trackerJobId ?? null,
      scraped_job_id: scrapedJobId ?? null,
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}
