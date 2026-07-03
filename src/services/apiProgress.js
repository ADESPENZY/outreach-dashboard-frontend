import api from "../api";
import { parseApiError } from "./apiUtils";

// ---------------------------------------------------------------------------
// Progress page — hero metrics, pipeline stages, activity timeline, momentum
// ---------------------------------------------------------------------------

export async function getProgress() {
  try {
    const response = await api.get("/api/outreach/progress/");
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
