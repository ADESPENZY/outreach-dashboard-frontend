import api from "../api";
import { parseApiError } from "./apiUtils";

// ---------------------------------------------------------------------------
// Inboxes / Inbox Stats
// ---------------------------------------------------------------------------

export async function getInboxStats() {
  try {
    const response = await api.get("/dashboard/inbox-stats/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}
