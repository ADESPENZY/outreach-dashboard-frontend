import api from "../api";
import { parseApiError } from "./apiUtils";

// ---------------------------------------------------------------------------
// Inboxes / Inbox Stats — route now lives under /api/integrations/gmail/
// ---------------------------------------------------------------------------

export async function getInboxStats() {
  try {
    const response = await api.get("/api/integrations/gmail/inbox-stats/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}
