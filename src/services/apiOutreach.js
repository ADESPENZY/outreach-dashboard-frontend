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

export async function bulkContactSearch() {
  try {
    // No timeout override — this can take 30–90 s depending on job count.
    const response = await api.post("/api/outreach/bulk-contact-search/");
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
      params: { status: "draft" },
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

/**
 * Fetches all non-draft emails in a single parallel call.
 * Combines approved, sent, opened, and replied into one list.
 */
export async function getSentEmails() {
  try {
    const [approvedRes, sentRes, openedRes, repliedRes] = await Promise.all([
      api.get("/api/outreach/emails/", { params: { status: "approved" } }),
      api.get("/api/outreach/emails/", { params: { status: "sent" } }),
      api.get("/api/outreach/emails/", { params: { status: "opened" } }),
      api.get("/api/outreach/emails/", { params: { status: "replied" } }),
    ]);
    return [
      ...approvedRes.data,
      ...sentRes.data,
      ...openedRes.data,
      ...repliedRes.data,
    ];
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function generateEmail(jobId) {
  try {
    const response = await api.post("/api/outreach/generate-email/", {
      job_id: jobId,
    });
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

export async function markEmailReplied(emailId) {
  try {
    const response = await api.patch(
      `/api/outreach/emails/${emailId}/mark-replied/`
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
