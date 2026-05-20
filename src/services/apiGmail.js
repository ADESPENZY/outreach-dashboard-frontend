import api from "../api";
import { parseApiError } from "./apiUtils";

// ---------------------------------------------------------------------------
// Gmail Accounts — routes now live under /api/integrations/gmail/
// ---------------------------------------------------------------------------

export async function getGmailAccounts() {
  try {
    const response = await api.get("/api/integrations/gmail/accounts/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function createGmailAccount(data) {
  try {
    const response = await api.post("/api/integrations/gmail/accounts/create/", data);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function deleteGmailAccount(id) {
  try {
    const response = await api.post(`/api/integrations/gmail/accounts/${id}/delete/`);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function toggleGmailAccount(id) {
  try {
    const response = await api.post(`/api/integrations/gmail/accounts/${id}/toggle/`);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}
