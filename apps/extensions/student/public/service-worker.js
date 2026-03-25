const SCREENSHOT_POLL_ALARM = "screenshot-pending-poll";
const API_BASE = "http://localhost:3000/api";
const NOTIFIED_KEY = "notifiedScreenshotCorrelationIds";

function ensurePollingAlarm() {
  chrome.alarms.create(SCREENSHOT_POLL_ALARM, { periodInMinutes: 1 });
}

chrome.runtime.onInstalled.addListener(() => {
  ensurePollingAlarm();
  void pollPendingScreenshotRequests();
});

chrome.runtime.onStartup.addListener(() => {
  ensurePollingAlarm();
  void pollPendingScreenshotRequests();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== SCREENSHOT_POLL_ALARM) return;
  void pollPendingScreenshotRequests();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (!changes?.studentAuth && !changes?.studentSessionState) return;
  ensurePollingAlarm();
  void pollPendingScreenshotRequests();
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (!notificationId.startsWith("screenshot-request:")) return;
  void openOrFocusExtensionPage();
});

async function pollPendingScreenshotRequests() {
  try {
    const auth = await getStudentAuth();
    if (!auth?.token || !auth?.studentId) return;

    const endpoint = `${API_BASE}/screenshot/pending?studentId=${encodeURIComponent(auth.studentId)}&limit=10`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        authorization: `Bearer ${auth.token}`
      }
    });
    if (!response.ok) return;

    const pendingItems = await response.json();
    if (!Array.isArray(pendingItems) || pendingItems.length === 0) return;

    const notifiedSet = await getNotifiedCorrelationIds();
    for (const item of pendingItems) {
      const correlationId = String(item?.correlationId ?? "");
      const teacherId = String(item?.teacherId ?? "");
      if (!correlationId || notifiedSet.has(correlationId)) continue;

      const notificationId = `screenshot-request:${correlationId}`;
      chrome.notifications.create(notificationId, {
        type: "basic",
        iconUrl: "icon-128.png",
        title: "Solicitacao de screenshot",
        message: teacherId
          ? `Professor ${teacherId.slice(0, 8)} solicitou um screenshot.`
          : "Professor solicitou um screenshot.",
        priority: 2
      });

      notifiedSet.add(correlationId);
    }

    await setNotifiedCorrelationIds(Array.from(notifiedSet).slice(-100));
  } catch (_error) {
    // Keep service worker resilient; polling runs again on next alarm/storage update.
  }
}

function getStudentAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["studentAuth", "studentSessionState"], (result) => {
      const auth = result?.studentAuth ?? null;
      if (auth?.token && auth?.studentId) {
        resolve(auth);
        return;
      }

      const sessionState = result?.studentSessionState ?? null;
      if (sessionState?.token && sessionState?.studentId) {
        resolve({
          token: String(sessionState.token),
          studentId: String(sessionState.studentId)
        });
        return;
      }

      resolve(null);
    });
  });
}

function getNotifiedCorrelationIds() {
  return new Promise((resolve) => {
    chrome.storage.local.get([NOTIFIED_KEY], (result) => {
      const values = Array.isArray(result?.[NOTIFIED_KEY]) ? result[NOTIFIED_KEY] : [];
      resolve(new Set(values.map((value) => String(value))));
    });
  });
}

function setNotifiedCorrelationIds(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [NOTIFIED_KEY]: values }, () => resolve());
  });
}

async function openOrFocusExtensionPage() {
  const targetUrl = chrome.runtime.getURL("index.html");
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find((tab) => tab.url && tab.url.startsWith(targetUrl));
  if (existing?.id) {
    await chrome.tabs.update(existing.id, { active: true });
    return;
  }
  await chrome.tabs.create({ url: targetUrl, active: true });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "CAPTURE_VISIBLE_TAB") {
    return false;
  }

  chrome.tabs.captureVisibleTab(undefined, { format: "png" }, (dataUrl) => {
    const runtimeError = chrome.runtime.lastError;
    if (runtimeError) {
      sendResponse({
        ok: false,
        error: runtimeError.message || "captureVisibleTab failed"
      });
      return;
    }

    if (!dataUrl || typeof dataUrl !== "string") {
      sendResponse({ ok: false, error: "captureVisibleTab returned empty payload" });
      return;
    }

    sendResponse({ ok: true, dataUrl });
  });

  return true;
});

ensurePollingAlarm();
void pollPendingScreenshotRequests();
