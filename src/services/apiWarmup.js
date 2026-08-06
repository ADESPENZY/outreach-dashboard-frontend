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

// ---------------------------------------------------------------------------
// Warm-up POOL enrolment (the opt-in seed-exchange engine that builds inbox
// reputation, one enrolment per inbox). Separate from everything above, which
// targets the legacy `warmup` app.
// ---------------------------------------------------------------------------

// The consent wording version the user agrees to when enabling. Must match the
// backend's CURRENT_CONSENT_VERSION; bump both together if the copy changes so
// consent records stay auditable against exactly what was shown.
export const WARMUP_CONSENT_VERSION = "v1";

// Enable or disable warm-up for ONE specific inbox. Enabling records the user's
// consent (backend stamps consented_at + the version).
export async function toggleWarmupPool(accountId, enable, consentVersion = WARMUP_CONSENT_VERSION) {
  try {
    const { data } = await api.post(`/api/warmup/accounts/${accountId}/toggle/`, {
      enable,
      consent_version: consentVersion,
    });
    return data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}
