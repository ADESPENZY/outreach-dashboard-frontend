import api from "../api";
import { parseApiError } from "./apiUtils";

export async function getAutoScoutSettings() {
  try {
    const response = await api.get("/api/settings/auto-scout/");
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function updateAutoScoutSettings(data) {
  try {
    const response = await api.patch("/api/settings/auto-scout/", data);
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}
