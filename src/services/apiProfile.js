import api from "../api";
import { parseApiError } from "./apiUtils";

// ---------------------------------------------------------------------------
// User Profile
// ---------------------------------------------------------------------------

export async function getProfile() {
  try {
    const response = await api.get("/api/accounts/profile/");
    return response.data;
  } catch (err) {
    // 404 means the user hasn't created a profile yet — that's a valid state
    if (err.response?.status === 404) return null;
    throw new Error(parseApiError(err));
  }
}

export async function createProfile(data) {
  try {
    const response = await api.post("/api/accounts/profile/", data);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function updateProfile(data) {
  try {
    const response = await api.patch("/api/accounts/profile/", data);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function uploadCV(formData) {
  try {
    const response = await api.post("/api/accounts/profile/upload-cv/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function extractSkills() {
  try {
    const response = await api.post("/api/accounts/profile/extract-skills/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

// Pilot intake — tell us which Gmail introductions will send from. Fires the
// personal founder ack + the "add this Gmail in Cloud Console" founder alert.
export async function requestSendingDesk(gmail) {
  try {
    const response = await api.post("/api/accounts/profile/sending-desk/", { gmail });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}
