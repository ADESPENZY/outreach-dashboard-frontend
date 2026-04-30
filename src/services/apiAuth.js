import api from "../api";
import { parseApiError } from "./apiUtils";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(data) {
  try {
    const response = await api.post("token/", data);
    return response.data;
  } catch (err) {
    // Surface a friendly message for wrong credentials instead of a generic one
    if (err.response?.status === 401) throw new Error("Invalid email or password.");
    throw new Error(parseApiError(err));
  }
}

export async function getMe() {
  try {
    const response = await api.get("/dashboard/auth/me/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}
