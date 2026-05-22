import api from "../api";
import { parseApiError } from "./apiUtils";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(data) {
  try {
    const response = await api.post("/api/accounts/auth/login/", data);
    return response.data;
  } catch (err) {
    // 401 — wrong credentials (expected path)
    if (err.response?.status === 401) throw new Error("Invalid username or password.");
    // 500 — server crash; never expose raw HTML/stack traces to the UI
    if (err.response?.status === 500) throw new Error("Something went wrong on our end. Please try again shortly.");
    throw new Error(parseApiError(err));
  }
}

export async function register(data) {
  try {
    const response = await api.post("/api/accounts/auth/register/", data);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function getMe() {
  try {
    const response = await api.get("/api/accounts/auth/me/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}
