import api from "../api";
import { parseApiError } from "./apiUtils";

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export async function getAnalytics(days = 30) {
  try {
    const response = await api.get("/api/outreach/analytics/", {
      params: { days },
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}
