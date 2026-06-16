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
    // Attach the original axios response to every thrown Error so that callers
    // (e.g. LoginPage onError) can read response.data.detail directly instead
    // of only having access to the pre-formatted message string.
    const wrap = (msg) => {
      const e = new Error(msg);
      e.response = err.response; // preserve for callers that need raw response data
      return e;
    };

    // 401 — wrong credentials (expected path)
    if (err.response?.status === 401) throw wrap("Invalid username or password. Please try again.");
    // 500 — server crash; never expose raw HTML/stack traces to the UI
    if (err.response?.status === 500) throw wrap("Something went wrong on our end. Please try again shortly.");
    throw wrap(parseApiError(err));
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

export async function googleAuth(credential) {
  try {
    const response = await api.post("/api/accounts/auth/google/", { credential });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function setUsername(username) {
  try {
    const response = await api.patch("/api/accounts/auth/set-username/", { username });
    return response.data;
  } catch (err) {
    // Return field-level error so the modal can display it inline
    const detail = err.response?.data?.username || parseApiError(err);
    throw new Error(detail);
  }
}

export async function changePassword({ current_password, new_password }) {
  try {
    const response = await api.post("/api/accounts/auth/change-password/", {
      current_password, new_password,
    });
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || parseApiError(err));
  }
}

export async function deleteAccount({ password, confirm }) {
  try {
    const response = await api.post("/api/accounts/auth/delete-account/", { password, confirm });
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || parseApiError(err));
  }
}

export async function forgotPassword(email) {
  try {
    const response = await api.post("/api/accounts/auth/forgot-password/", { email });
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || parseApiError(err));
  }
}
