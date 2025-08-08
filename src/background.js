import { DateTime } from "../lib/luxon.js";
import {
  kExpirationKey,
  kStorageKey,
  kTitleKey,
  kURLKey,
  kStorageDefaultHours,
  kForeverTab,
  urlToKey,
} from "./common.js";

// --- Main Initialization ---
setupAlarms();
setupTabEventListeners();
setupMessageListener();

// --- Core Functions ---

function setupAlarms() {
  chrome.alarms.create("checkExpiration", { periodInMinutes: 1 });
  chrome.alarms.create("updateBadge", { periodInMinutes: 0.5 });
  chrome.alarms.create("cleanupExpiredTabs", { periodInMinutes: 60 });
}


  function setupTabEventListeners() {
  chrome.tabs.onCreated.addListener(handleTabCreated);
  chrome.tabs.onUpdated.addListener(handleTabUpdated);
  chrome.tabs.onRemoved.addListener(handleTabRemoved);
  chrome.tabs.onActivated.addListener((activeInfo) =>
    setBadgeAndTitle(activeInfo.tabId),
  );
}

function setupMessageListener() {
  chrome.runtime.onMessage.addListener(
    async (request, sender, sendResponse) => {
      if (request.setExpiration) {
        await setExpirationDateTime(
          request.setExpiration.tabTitle,
          request.setExpiration.tabURL,
          request.setExpiration.chosenDateTime,
        );
      }
      if (request.deleteTab) {
        if (request.deleteTab.tabURL) {
          await removeTab(request.deleteTab.tabURL);
        } else if (request.deleteTab.tabId) {
          await removeTabById(request.deleteTab.tabId);
        }
      }
    },
  );
}

// --- Event Handlers & Core Logic ---

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "updateBadge") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        setBadgeAndTitle(tabs[0].id);
      }
    });
  } else if (alarm.name === "checkExpiration") {
    const result = await chrome.storage.local.get({ [kStorageKey]: {} });
    const expiringTabInformation = result[kStorageKey];
    const currentTime = DateTime.now();
    let changed = false;
    for (const key in expiringTabInformation) {
      const tabInformation = expiringTabInformation[key];
      if (tabInformation[kExpirationKey] === kForeverTab) {
        continue;
      }
      const expirationTime = DateTime.fromISO(tabInformation[kExpirationKey]);
      if (currentTime >= expirationTime) {
        const tabsToClose = await chrome.tabs.query({
          url: tabInformation[kURLKey],
        });
        for (const tab of tabsToClose) {
          chrome.tabs.remove(tab.id).catch(() => {});
        }
        delete expiringTabInformation[key];
        changed = true;
      }
    }
    if (changed) {
      await chrome.storage.local.set({
        [kStorageKey]: expiringTabInformation,
      });
    }
  } else if (alarm.name === "cleanupExpiredTabs") {
    const result = await chrome.storage.local.get({ [kStorageKey]: {} });
    const expiringTabInformation = result[kStorageKey];
    const oneDayAgo = DateTime.now().minus({ days: 1 });
    let changed = false;
    for (const key of Object.keys(expiringTabInformation)) {
      const tabInfo = expiringTabInformation[key];
      if (
        tabInfo &&
        tabInfo[kExpirationKey] &&
        tabInfo[kExpirationKey] !== kForeverTab
      ) {
        const expirationTime = DateTime.fromISO(tabInfo[kExpirationKey]);
        if (expirationTime < oneDayAgo) {
          delete expiringTabInformation[key];
          changed = true;
        }
      }
    }

    if (changed) {
      await chrome.storage.local.set({
        [kStorageKey]: expiringTabInformation,
      });
    }
  }
});

function isNewTab(url) {
  return !url || url === "about:blank" || url.startsWith("chrome://newtab");
}

async function handleTabCreated(tab) {
  if (isNewTab(tab.url)) return;
  const key = urlToKey(tab.url);
  if (!key) return;
  if (tab.pinned) {
    await setExpirationDateTime(tab.title, tab.url, kForeverTab);
    return;
  }
  if (tab.windowId) {
    try {
      const win = await chrome.windows.get(tab.windowId);
      if (win.type === "app") {
        await setExpirationDateTime(tab.title, tab.url, kForeverTab);
        return;
      }
    } catch (e) {
      /* window might be gone */
    }
  }
  const { [kStorageDefaultHours]: defaultExpiry = 12 } =
    await chrome.storage.sync.get(kStorageDefaultHours);
  const expirationDateTime = DateTime.now()
    .plus({ hours: defaultExpiry })
    .toString();
  await setExpirationDateTime(tab.title, tab.url, expirationDateTime);
}

async function handleTabUpdated(tabId, changeInfo, tab) {
  if (!tab || isNewTab(tab.url)) return;
  const key = urlToKey(tab.url);
  if (!key) return;
  if (tab.pinned) {
    await setExpirationDateTime(tab.title, tab.url, kForeverTab);
    return;
  }

  if (changeInfo.status === "complete" && tab.url) {
    const result = await chrome.storage.local.get({ [kStorageKey]: {} });
    const expiringTabInformation = result[kStorageKey];
    if (expiringTabInformation[key]) {
      expiringTabInformation[key][kTitleKey] = tab.title;
      expiringTabInformation[key][kURLKey] = tab.url;
      await chrome.storage.local.set({
        [kStorageKey]: expiringTabInformation,
      });
    } else {
      const { [kStorageDefaultHours]: defaultExpiry = 12 } =
        await chrome.storage.sync.get(kStorageDefaultHours);
      const expirationDateTime = DateTime.now()
        .plus({ hours: defaultExpiry })
        .toString();
      await setExpirationDateTime(tab.title, tab.url, expirationDateTime);
    }
  }
  await setBadgeAndTitle(tabId);
}

function handleTabRemoved(tabId, removeInfo) {
  // We don't need to do anything here anymore, as we are not tracking by tabId
}

async function setExpirationDateTime(
  tabTitle,
  tabURL,
  expirationDateTime,
) {
  if (isNewTab(tabURL)) return;
  const key = urlToKey(tabURL);
  if (!key) return;

  const result = await chrome.storage.local.get({ [kStorageKey]: {} });
  const expiringTabInformation = result[kStorageKey];

  expiringTabInformation[key] = {
    [kExpirationKey]: expirationDateTime,
    [kTitleKey]: tabTitle,
    [kURLKey]: tabURL,
  };

  await chrome.storage.local.set({
    [kStorageKey]: expiringTabInformation,
  });
  const tabs = await chrome.tabs.query({ url: tabURL });
  if (tabs && tabs[0]) {
    setBadgeAndTitle(tabs[0].id);
  }
}

async function removeTab(tabURL) {
  const key = urlToKey(tabURL);
  if (!key) return;
  const result = await chrome.storage.local.get({ [kStorageKey]: {} });
  const expiringTabInformation = result[kStorageKey];
  delete expiringTabInformation[key];
  await chrome.storage.local.set({
    [kStorageKey]: expiringTabInformation,
  });
}

async function removeTabById(tabId) {
  if (!tabId) return;
  const result = await chrome.storage.local.get({ [kStorageKey]: {} });
  const expiringTabInformation = result[kStorageKey];
  delete expiringTabInformation[tabId];
  await chrome.storage.local.set({
    [kStorageKey]: expiringTabInformation,
  });
}

async function setBadgeAndTitle(tabId) {
  if (!tabId) return;
  const tab = await chrome.tabs.get(tabId);
  if (isNewTab(tab.url)) {
    chrome.action.setBadgeText({ tabId, text: "" });
    return;
  }
  const key = urlToKey(tab.url);
  if (!key) return;
  const result = await chrome.storage.local.get({ [kStorageKey]: {} });
  const expiringTabInformation = result[kStorageKey];
  const tabInfo = expiringTabInformation[key];
  if (!tabInfo) {
    chrome.action.setBadgeText({ tabId, text: "" });
    return;
  }
  const expirationDate = tabInfo[kExpirationKey];
  if (expirationDate === kForeverTab) {
    chrome.action.setBadgeBackgroundColor({ color: [0, 125, 0, 100] });
    chrome.action.setTitle({ tabId: tabId, title: `This tab never expires` });
    chrome.action.setBadgeText({ tabId: tabId, text: `∞` });
    return;
  }
  const expirationDateTime = DateTime.fromISO(expirationDate);
  const now = DateTime.now();
  const diffMinutes = expirationDateTime.diff(now, "minutes").minutes;
  let text = "";
  let color = [0, 0, 0, 0];
  if (diffMinutes < 0) {
    text = "...";
  } else if (diffMinutes < 60) {
    text = `${Math.floor(diffMinutes)}m`;
    color = [255, 0, 0, 100]; // Red
  } else if (diffMinutes < 180) {
    text = `${Math.ceil(diffMinutes / 60)}h`;
    color = [200, 200, 0, 100]; // Amber
  } else if (diffMinutes < 24 * 60) {
    text = `${Math.ceil(diffMinutes / 60)}h`;
  } else {
    text = `${Math.ceil(diffMinutes / (60 * 24))}d`;
  }
  chrome.action.setBadgeText({ tabId: tabId, text });
  chrome.action.setBadgeBackgroundColor({ tabId: tabId, color });
  const remaining = expirationDateTime.diff(now, [
    "months",
    "days",
    "hours",
    "minutes",
  ]);
  chrome.action.setTitle({
    tabId: tabId,
    title: `Expires in: ${remaining.toFormat(
      "M 'months,' d 'days,' h 'hours,' m 'minutes'",
    )}`,
  });
}
