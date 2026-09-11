import api from "../api";
import { parseApiError } from "./apiUtils";

// ---------------------------------------------------------------------------
// Outreach — Contacts
// ---------------------------------------------------------------------------

export async function getContacts() {
  try {
    const response = await api.get("/api/outreach/contacts/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/** Cheap counts for the stats bar / tab badges / next-step strip, so each tab
 *  can lazy-load only its own list. */
export async function getOutreachCounts() {
  try {
    const response = await api.get("/api/outreach/counts/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function findContacts(maxSearches = 10) {
  try {
    const response = await api.post("/api/outreach/find-contacts/all/", {
      max_searches: maxSearches,
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * Kicks off a background contact search for the next batch of staging jobs.
 * Returns 202 immediately; poll getBulkSearchStatus() for live progress.
 */
export async function bulkContactSearch(maxJobs = 10) {
  try {
    const response = await api.post("/api/outreach/bulk-contact-search/", {
      max_jobs: maxJobs,
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function getBulkSearchStatus() {
  try {
    const response = await api.get("/api/outreach/bulk-contact-search/status/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function getHunterQuota() {
  try {
    const response = await api.get("/api/outreach/hunter-quota/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function findContactManual(jobId) {
  try {
    const response = await api.post("/api/outreach/find-contact-manual/", {
      job_id: jobId,
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

// ---------------------------------------------------------------------------
// Outreach — Emails
// ---------------------------------------------------------------------------

export async function getDraftEmails() {
  try {
    const response = await api.get("/api/outreach/emails/", {
      params: { status: "draft", limit: 150 },
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * Fetches all non-draft emails in ONE request (the endpoint takes a
 * comma-separated status list). Was six parallel calls + six CORS preflights.
 */
export async function getSentEmails() {
  try {
    const response = await api.get("/api/outreach/emails/", {
      // Most recent 150 is plenty for the list view; the full history was
      // needless weight for accounts with a lot of sends.
      params: { status: "approved,sent,opened,replied,bounced,failed", limit: 150 },
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function generateEmail(jobId, extras = {}) {
  try {
    const response = await api.post("/api/outreach/generate-email/", {
      job_id: jobId,
      ...extras,
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * Generates drafts for every contact that has no email yet.
 * Returns 202 immediately — generation runs server-side in the background.
 */
export async function bulkGenerateEmails(extras = {}) {
  try {
    const response = await api.post("/api/outreach/emails/generate-all/", extras);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function approveEmail(emailId) {
  try {
    const response = await api.patch(`/api/outreach/emails/${emailId}/approve/`);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function sendEmail(emailId) {
  try {
    const response = await api.post(`/api/outreach/emails/${emailId}/send/`);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function queueEmail(emailId) {
  try {
    const response = await api.post(`/api/outreach/emails/${emailId}/queue/`);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function queueAllEmails() {
  try {
    const response = await api.post('/api/outreach/emails/queue-all/');
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function processQueue() {
  try {
    const response = await api.post('/api/outreach/emails/process-queue/');
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function deleteEmail(emailId) {
  try {
    const response = await api.delete(`/api/outreach/emails/${emailId}/delete/`);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function unqueueEmail(emailId) {
  try {
    const response = await api.post(`/api/outreach/emails/${emailId}/unqueue/`);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function rescheduleEmail(emailId, sendAt) {
  try {
    const response = await api.post(`/api/outreach/emails/${emailId}/reschedule/`, {
      send_at: sendAt,
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * Hand-mark an introduction as replied, for a reply the scanner missed.
 *
 * Marks the whole thread and stops its follow-ups (same server path the scan
 * uses). Pass replyBody when you have what they actually wrote — intent
 * classification and the CV-request draft can only run with the text.
 */
export async function markEmailReplied(emailId, replyBody = '') {
  try {
    const response = await api.patch(
      `/api/outreach/emails/${emailId}/mark-replied/`,
      replyBody ? { reply_body: replyBody } : {}
    );
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function editEmail(emailId, { subject, body }) {
  try {
    const response = await api.patch(
      `/api/outreach/emails/${emailId}/edit/`,
      { subject, body }
    );
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function runFollowups() {
  try {
    const response = await api.post("/api/outreach/followups/run/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

// ---------------------------------------------------------------------------
// Outreach — CV Generation
// ---------------------------------------------------------------------------

export async function generateJobCV(jobId) {
  try {
    const response = await api.post(`/api/outreach/jobs/${jobId}/generate-cv/`, {});
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function getJobCVJson(jobId) {
  try {
    const response = await api.get(`/api/outreach/jobs/${jobId}/cv/json/`);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function getJobCV(jobId) {
  try {
    const response = await api.get(`/api/outreach/jobs/${jobId}/cv/`, {
      responseType: "blob",
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * One-shot tailored-CV download for the "Apply Direct" flow. Generates (or
 * reuses) a job-specific CV. Returns { blob, filename } with the server's
 * filename. On error the server sends JSON, so we decode the blob to surface
 * the real message.
 */
export async function generateTailoredCV(jobId) {
  try {
    const response = await api.post(
      "/api/outreach/generate-cv/",
      { job_id: jobId },
      { responseType: "blob" }
    );
    return {
      blob: response.data,
      filename: filenameFromHeaders(response.headers),
    };
  } catch (err) {
    // The error body is a Blob (responseType: blob) — try to read its JSON.
    const blob = err?.response?.data;
    if (blob instanceof Blob) {
      try {
        const text = await blob.text();
        const json = JSON.parse(text);
        throw new Error(json.error || "Could not generate your CV.");
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message) throw parseErr;
      }
    }
    throw new Error(parseApiError(err));
  }
}

// ---------------------------------------------------------------------------
// Outreach — CV template picker
//
// Rendering is separate from generation. generateJobCV() above does the (cached)
// OpenAI work once; everything here re-renders that same stored content into a
// different design, so switching styles costs nothing.
// ---------------------------------------------------------------------------

/**
 * Pull the download filename out of a response's Content-Disposition.
 *
 * The server is the single source of truth for CV filenames (see
 * outreach.views._safe_cv_filename). The frontend used to invent its own here,
 * which is how downloads ended up named inconsistently and without the
 * candidate's name. Readable cross-origin only because the backend lists the
 * header in CORS_EXPOSE_HEADERS — hence the fallback, which keeps downloads
 * working if that ever regresses.
 */
export function filenameFromHeaders(headers, fallback = 'CV.pdf') {
  const raw = headers?.['content-disposition'] || headers?.['Content-Disposition'] || '';
  // filename*=UTF-8''name.pdf  |  filename="name.pdf"  |  filename=name.pdf
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(raw);
  if (!match) return fallback;
  try {
    return decodeURIComponent(match[1]).trim() || fallback;
  } catch {
    return match[1].trim() || fallback;
  }
}

/** Pickable designs + the user's saved default. */
export async function getCvTemplates() {
  try {
    const response = await api.get("/api/outreach/cv/templates/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * Re-render an already-generated CV in `template`.
 * Never triggers generation — the job must already have a stored resume.
 * Returns { blob, filename } with the filename the SERVER chose.
 */
export async function renderCvPdf(jobId, template) {
  try {
    const response = await api.post(
      "/api/outreach/cv/render/",
      { job_id: jobId, template },
      { responseType: "blob" }
    );
    return {
      blob: response.data,
      filename: filenameFromHeaders(response.headers),
    };
  } catch (err) {
    // Error bodies arrive as a Blob because of responseType — decode for a
    // usable message.
    const blob = err?.response?.data;
    if (blob instanceof Blob) {
      try {
        const json = JSON.parse(await blob.text());
        throw new Error(json.error || "Could not render your CV.");
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message) throw parseErr;
      }
    }
    throw new Error(parseApiError(err));
  }
}

/**
 * Draft the user's response to an inbound reply, for review. Never sends.
 * `force` re-drafts over an existing one.
 */
export async function draftReply(
  emailId,
  { force = false, applied = false, attachCv = undefined } = {}
) {
  try {
    const body = { applied };
    if (attachCv !== undefined) body.attach_cv = attachCv;
    const response = await api.post(
      `/api/outreach/emails/${emailId}/draft-reply/${force ? "?force=true" : ""}`,
      body
    );
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * Send the user's approved reply, threaded into the existing conversation.
 * `body` is whatever they have in the box — their edits, not our draft.
 * attachCv attaches the tailored CV (cv_request case).
 */
export async function sendReply(emailId, body, { attachCv = false } = {}) {
  try {
    const response = await api.post(`/api/outreach/emails/${emailId}/reply/`, {
      body,
      attach_cv: attachCv,
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}
