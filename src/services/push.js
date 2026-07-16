import api from "../api";

// VAPID public key (base64url) → Uint8Array, as PushManager.subscribe requires.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function isIOS() {
  const ua = window.navigator.userAgent || "";
  return (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

// iOS only allows web push inside the INSTALLED PWA. Elsewhere the browser is fine.
export function pushAvailableHere() {
  if (!pushSupported()) return false;
  if (isIOS() && !isStandalone()) return false;
  return true;
}

export function permissionState() {
  return typeof Notification !== "undefined" ? Notification.permission : "denied";
}

export async function getVapidKey() {
  try {
    const { data } = await api.get("/api/accounts/push/vapid-public-key/");
    return data?.enabled ? data.publicKey : "";
  } catch {
    return "";
  }
}

export async function isPushEnabled() {
  if (!pushSupported() || permissionState() !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    return !!(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/** Request permission, subscribe, and register with the backend. Returns true on success. */
export async function enablePush() {
  if (!pushAvailableHere()) return false;
  const key = await getVapidKey();
  if (!key) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }
  await api.post("/api/accounts/push/subscribe/", sub.toJSON());
  return true;
}

export async function disablePush() {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      try {
        await api.post("/api/accounts/push/unsubscribe/", { endpoint: sub.endpoint });
      } catch { /* ignore */ }
      await sub.unsubscribe();
    }
  } catch { /* ignore */ }
}

export async function sendTestPush() {
  try {
    const { data } = await api.post("/api/accounts/push/test/", {});
    return data?.sent ?? 0;
  } catch {
    return 0;
  }
}
