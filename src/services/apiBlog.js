import api from "../api"
import { v4 as uuidv4 } from "uuid"

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function login(data) {
    try {
        const response = await api.post("token/", data)
        return response.data
    } catch(err) {
        if (err.status === 401) throw new Error("Invalid Credentials")
        throw new Error(err)
    }
}

export async function getMe() {
    try {
        const response = await api.get("/dashboard/auth/me/")
        return response.data;
    } catch(err) {
        throw new Error(err.message);
    }
}

// ---------------------------------------------------------------------------
// Gmail accounts
// ---------------------------------------------------------------------------
export async function getGmailAccounts() {
  try {
    const response = await api.get("/dashboard/gmail-accounts/");
    return response.data;
  } catch (err) {
    throw new Error(err.message);
  }
}

export async function createGmailAccount(data) {
  try {
    const response = await api.post("/dashboard/gmail-accounts/create/", data);
    return response.data;
  } catch (err) {
    throw new Error(err.message);
  }
}

export async function deleteGmailAccount(id) {
  try {
    const response = await api.post(`/dashboard/gmail-accounts/${id}/delete/`);
    return response.data;
  } catch (err) {
    throw new Error(err.message);
  }
}

// ---------------------------------------------------------------------------
// Job Tracker
// ---------------------------------------------------------------------------

export async function getJobs({ search = "", status = "" } = {}) {
  const params = {};
  if (search) params.search = search;
  if (status) params.status = status;
  const response = await api.get("/dashboard/jobs/", { params });
  return response.data;
}

export async function getJobStats() {
  const response = await api.get("/dashboard/jobs/stats/");
  return response.data;
}

export async function getJob(id) {
  const response = await api.get(`/dashboard/jobs/${id}/`);
  return response.data;
}

/**
 * Create a job with an idempotency key so double-clicks / retries
 * never insert duplicate rows.
 */
export async function createJob(data) {
  const response = await api.post("/dashboard/jobs/create/", data, {
    headers: { "Idempotency-Key": uuidv4() },
  });
  return response.data;
}

export async function updateJob(id, data) {
  const response = await api.put(`/dashboard/jobs/${id}/update/`, data);
  return response.data;
}

/**
 * Kanban drag-and-drop — only sends status + sub_status.
 * Naturally idempotent on the backend.
 */
export async function patchJobStatus(id, status, subStatus = "") {
  const response = await api.patch(`/dashboard/jobs/${id}/status/`, {
    status,
    sub_status: subStatus,
  });
  return response.data;
}

export async function deleteJob(id) {
  await api.delete(`/dashboard/jobs/${id}/delete/`);
}

// ---------------------------------------------------------------------------
// User Profile
// ---------------------------------------------------------------------------

export async function getProfile() {
  try {
    const response = await api.get('/dashboard/profile/');
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw new Error(err.message);
  }
}

export async function createProfile(data) {
  const response = await api.post('/dashboard/profile/', data);
  return response.data;
}

export async function updateProfile(data) {
  const response = await api.patch('/dashboard/profile/', data);
  return response.data;
}

export async function uploadCV(formData) {
  const response = await api.post('/dashboard/profile/upload-cv/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function extractSkills() {
  const response = await api.post('/dashboard/profile/extract-skills/');
  return response.data;
}