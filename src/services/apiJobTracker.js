import api from "../api";
import { v4 as uuidv4 } from "uuid";
import { parseApiError } from "./apiUtils";

// ---------------------------------------------------------------------------
// Job Tracker (Kanban board)
// ---------------------------------------------------------------------------

export async function getJobs({ search = "", status = "" } = {}) {
  try {
    const params = {};
    if (search) params.search = search;
    if (status) params.status = status;
    const response = await api.get("/dashboard/jobs/", { params });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function getJobStats() {
  try {
    const response = await api.get("/dashboard/jobs/stats/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function getJob(id) {
  try {
    const response = await api.get(`/dashboard/jobs/${id}/`);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * Create a job with an idempotency key so double-clicks / retries
 * never insert duplicate rows.
 */
export async function createJob(data) {
  try {
    const response = await api.post("/dashboard/jobs/create/", data, {
      headers: { "Idempotency-Key": uuidv4() },
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function updateJob(id, data) {
  try {
    const response = await api.put(`/dashboard/jobs/${id}/update/`, data);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * Kanban drag-and-drop — only sends status + sub_status.
 */
export async function patchJobStatus(id, status, subStatus = "") {
  try {
    const response = await api.patch(`/dashboard/jobs/${id}/status/`, {
      status,
      sub_status: subStatus,
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function deleteJob(id) {
  try {
    await api.delete(`/dashboard/jobs/${id}/delete/`);
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function getGmailData() {
  try {
    const response = await api.get("/dashboard/gmail-data/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}
