import api from "../api";
import { parseApiError } from "./apiUtils";

// ---------------------------------------------------------------------------
// Interview Prep — sessions, prepared answers
// Backend: Backend/interview (mounted at /api/interview/).
// ---------------------------------------------------------------------------

// Creating a session can look up the company (search + a model pass), and
// preparing writes ~25 answers in one model call — both routinely outlast the
// client's default 20 s timeout. `_netRetry: true` also opts them out of the
// interceptor's automatic retry on timeout: retrying would create a duplicate
// session, or pay for the same prep twice, while the first is still running.
const SLOW_CREATE = { timeout: 60000, _netRetry: true };
const SLOW_PREP = { timeout: 150000, _netRetry: true };

/** The user's interviews, newest first: [{id, company_name, job_title, status, created_at}]. */
export async function listInterviewSessions() {
  try {
    const response = await api.get("/api/interview/sessions/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * Start an interview.
 * cvSource 'base' uses the profile CV; 'custom' uses cvText (the CV they applied with).
 * Company-only (no job description) makes the backend research the company.
 */
export async function createInterviewSession({ cvSource, cvText, jdText, companyName, jobId }) {
  try {
    const response = await api.post(
      "/api/interview/sessions/",
      {
        cv_source: cvSource,
        cv_text: cvSource === "custom" ? cvText : "",
        jd_text: jdText || "",
        company_name: companyName || "",
        job_id: jobId ?? null,
      },
      SLOW_CREATE,
    );
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/** Write the likely questions + answers for a session. Resolves to {count}. */
export async function prepareInterviewSession(sessionId) {
  try {
    const response = await api.post(`/api/interview/sessions/${sessionId}/prep/`, {}, SLOW_PREP);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}
