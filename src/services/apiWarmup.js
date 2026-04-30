import api from "../api";
import { parseApiError } from "./apiUtils";

// ---------------------------------------------------------------------------
// Email Warmup
// ---------------------------------------------------------------------------

export async function getWarmupSessions() {
  try {
    const response = await api.get("/api/warmup/sessions/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function getWarmupStats(days = 30) {
  try {
    const response = await api.get(`/api/warmup/stats/?days=${days}`);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function createWarmupSession(data) {
  try {
    const response = await api.post("/api/warmup/sessions/", data);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function toggleWarmupSession(sessionId) {
  try {
    const response = await api.post(`/api/warmup/sessions/${sessionId}/toggle/`);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function runWarmup() {
  try {
    const response = await api.post("/api/warmup/run/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function getAvailableAccounts() {
  try {
    const response = await api.get("/api/warmup/available-accounts/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}
