import api from "../api";
import { parseApiError } from "./apiUtils";

// ---------------------------------------------------------------------------
// Gmail Accounts
// ---------------------------------------------------------------------------

export async function getGmailAccounts() {
  try {
    const response = await api.get("/dashboard/gmail-accounts/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function createGmailAccount(data) {
  try {
    const response = await api.post("/dashboard/gmail-accounts/create/", data);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function deleteGmailAccount(id) {
  try {
    const response = await api.post(`/dashboard/gmail-accounts/${id}/delete/`);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function toggleGmailAccount(id) {
  try {
    const response = await api.post(`/dashboard/gmail-accounts/${id}/toggle/`);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}
