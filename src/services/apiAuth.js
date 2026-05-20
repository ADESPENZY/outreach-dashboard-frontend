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
    if (err.response?.status === 401) throw new Error("Invalid email or password.");
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
