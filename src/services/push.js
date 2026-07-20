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

/** Never let a step hang forever — every await below is bounded. */
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`timeout:${label}`)), ms)
    ),
  ]);
}

/**
 * Request permission, subscribe, and register with the backend.
 * Returns { ok, reason } so the caller can say something useful.
 *
 * ORDER MATTERS: Notification.requestPermission() must be called while the
 * browser still considers us inside the user's tap ("user activation"). Doing
 * ANY network await first (we used to fetch the VAPID key here) burns that
 * activation, and iOS Safari then never resolves the permission promise — the
 * button hangs on "Enabling…" forever. So permission is requested FIRST,
 * straight out of the click, and everything else happens after.
 */
export async function enablePush() {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  if (isIOS() && !isStandalone()) return { ok: false, reason: "ios-not-installed" };

  // ── 1. Permission FIRST — still inside the user gesture ───────────────────
  try {
    let permission = permissionState();
    if (permission === "default") {
      permission = await withTimeout(Notification.requestPermission(), 60000, "permission");
    }
    if (permission === "denied") return { ok: false, reason: "denied" };
    if (permission !== "granted") return { ok: false, reason: "dismissed" };
  } catch (e) {
    return { ok: false, reason: String(e?.message || "").startsWith("timeout") ? "timeout" : "error" };
  }

  // ── 2. Everything else (network / SW) — bounded so it can't hang ──────────
  try {
    const key = await withTimeout(getVapidKey(), 15000, "vapid");
    if (!key) return { ok: false, reason: "not-configured" };

    const reg = await withTimeout(navigator.serviceWorker.ready, 15000, "sw");
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await withTimeout(
        reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        }),
        20000,
        "subscribe",
      );
    }
    await withTimeout(
      api.post("/api/accounts/push/subscribe/", sub.toJSON()),
      15000,
      "register",
    );
    return { ok: true, reason: "granted" };
  } catch (e) {
    const msg = String(e?.message || "");
    return { ok: false, reason: msg.startsWith("timeout") ? "timeout" : "error" };
  }
}

/** Human-readable explanation for an enablePush() failure reason. */
export function pushFailureMessage(reason) {
  switch (reason) {
    case "ios-not-installed":
      return "On iPhone, add ApplyDir to your home screen first, then open it from there.";
    case "denied":
      return "Notifications are blocked for this app — turn them back on in your device settings.";
    case "dismissed":
      return "No problem — you can turn notifications on anytime in Settings.";
    case "not-configured":
      return "Notifications aren't switched on for ApplyDir yet. Try again shortly.";
    case "timeout":
      return "That took too long. Check your connection and try again.";
    case "unsupported":
      return "This browser doesn't support notifications.";
    default:
      return "Couldn't turn on notifications. Please try again.";
  }
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
