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

// Gmail API (OAuth) — returns the Google consent URL to send the user to.
// The caller redirects the browser there; Google returns to the backend
// callback, which stores the refresh token and bounces back to Settings.
export async function getGmailOAuthUrl() {
  try {
    const response = await api.get("/api/integrations/gmail/oauth/authorize/");
    return response.data.authorize_url;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

// Outlook (Microsoft Graph, OAuth) — returns the Microsoft consent URL. Same
// flow as Gmail: redirect the browser there; Microsoft returns to the backend
// callback, which stores the token and bounces back to Settings.
export async function getOutlookOAuthUrl() {
  try {
    const response = await api.get("/api/integrations/outlook/oauth/authorize/");
    return response.data.authorize_url;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}
