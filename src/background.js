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
chrome.storage.local.get({ [kStorageKey]: {} }, (result) => {
  let expiringTabInformation = result[kStorageKey];

  // Attach listeners that rely on the latest tab information
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
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.setExpiration) {
        setExpirationDateTime(
          request.setExpiration.tabTitle,
          request.setExpiration.tabURL,
          request.setExpiration.chosenDateTime,
        );
        // Update expiringTabInformation from storage after modification
        chrome.storage.local.get({ [kStorageKey]: {} }, (result) => {
          expiringTabInformation = result[kStorageKey];
        });
      }
      if (request.deleteTab) {
        if (request.deleteTab.tabURL) {
          removeTab(request.deleteTab.tabURL);
        } else if (request.deleteTab.tabId) {
          removeTabById(request.deleteTab.tabId);
        }
      }
    });
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
      const currentTime = DateTime.now();
      const allTabs = await chrome.tabs.query({});
      Object.keys(expiringTabInformation).forEach((key) => {
        const tabInformation = expiringTabInformation[key];
        if (tabInformation[kExpirationKey] === kForeverTab) {
          return;
        }
        const expirationTime = DateTime.fromISO(tabInformation[kExpirationKey]);
        if (currentTime >= expirationTime) {
          const tab = allTabs.find(
            (t) => t.url === tabInformation[kURLKey],
          );
          if (tab) {
            chrome.tabs.remove(tab.id).catch(() => {});
          }
        }
      });
    } else if (alarm.name === "cleanupExpiredTabs") {
      const oneDayAgo = DateTime.now().minus({ days: 1 });
      let changed = false;
      Object.keys(expiringTabInformation).forEach((key) => {
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
      });

      if (changed) {
        chrome.storage.local.set({ [kStorageKey]: expiringTabInformation });
      }
    }
  });

  async function handleTabCreated(tab) {
    const key = urlToKey(tab.url);
    if (!key) return;
    if (tab.pinned) {
      setExpirationDateTime(tab.title, tab.url, kForeverTab);
      return;
    }
    if (tab.windowId) {
      try {
        const win = await chrome.windows.get(tab.windowId);
        if (win.type === "app") {
          setExpirationDateTime(tab.title, tab.url, kForeverTab);
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
    setExpirationDateTime(tab.title, tab.url, expirationDateTime);
  }

  async function handleTabUpdated(tabId, changeInfo, tab) {
    if (!tab) return;
    const key = urlToKey(tab.url);
    if (!key) return;
    if (tab.pinned) {
      setExpirationDateTime(tab.title, tab.url, kForeverTab);
      return;
    }

    if (changeInfo.status === "complete" && tab.url) {
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
        setExpirationDateTime(tab.title, tab.url, expirationDateTime);
      }
    }
    setBadgeAndTitle(tabId);
  }

  function handleTabRemoved(tabId, removeInfo) {
    // We don't need to do anything here anymore, as we are not tracking by tabId
  }

  function setExpirationDateTime(tabTitle, tabURL, expirationDateTime) {
    const key = urlToKey(tabURL);
    if (!key) return;
    expiringTabInformation[key] = {
      [kExpirationKey]: expirationDateTime,
      [kTitleKey]: tabTitle,
      [kURLKey]: tabURL,
    };
    chrome.storage.local
      .set({ [kStorageKey]: expiringTabInformation })
      .then(async () => {
        const tabs = await chrome.tabs.query({ url: tabURL });
        if (tabs && tabs[0]) {
          setBadgeAndTitle(tabs[0].id);
        }
      });
  }

  function removeTab(tabURL) {
    const key = urlToKey(tabURL);
    if (!key) return;
    delete expiringTabInformation[key];
    chrome.storage.local.set({ [kStorageKey]: expiringTabInformation });
  }

  function removeTabById(tabId) {
    if (!tabId) return;
    delete expiringTabInformation[tabId];
    chrome.storage.local.set({ [kStorageKey]: expiringTabInformation });
  }

  async function setBadgeAndTitle(tabId) {
    if (!tabId) return;
    const tab = await chrome.tabs.get(tabId);
    const key = urlToKey(tab.url);
    if (!key) return;
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
});
