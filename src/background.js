import { DateTime } from "../lib/luxon.js";
import {
  kExpirationKey,
  kStorageKey,
  kTitleKey,
  kURLKey,
  kStorageDefaultHours,
  kForeverTab,
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
    chrome.tabs.onRemoved.addListener(removeTab);
    chrome.tabs.onActivated.addListener((activeInfo) =>
      setBadgeAndTitle(activeInfo.tabId),
    );
  }

  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.setExpiration) {
        setExpirationDateTime(
          request.setExpiration.tabId,
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
        removeTab(request.deleteTab.tabId);
      }
    });
  }

  // --- Reconciliation Logic on Startup ---

  chrome.runtime.onStartup.addListener(() => {
    console.log("Browser startup detected. Reconciling tabs.");
    reconcileTabsOnStartup();
  });

  async function reconcileTabsOnStartup() {
    const { [kStorageKey]: oldTabInfo } =
      await chrome.storage.local.get(kStorageKey);
    if (!oldTabInfo || Object.keys(oldTabInfo).length === 0) {
      return; // Nothing to reconcile
    }

    const currentTabs = await chrome.tabs.query({});
    const newTabInfo = {};
    const reconciledOldIds = new Set();

    // Find a new home for old expiry data
    for (const currentTab of currentTabs) {
      const oldTabId = findBestMatchInOldInfo(
        currentTab.url,
        oldTabInfo,
        reconciledOldIds,
      );
      if (oldTabId) {
        newTabInfo[currentTab.id] = oldTabInfo[oldTabId];
        reconciledOldIds.add(oldTabId);
      }
    }

    // Replace the old data with the newly reconciled data
    expiringTabInformation = newTabInfo;
    await chrome.storage.local.set({ [kStorageKey]: expiringTabInformation });
    console.log("Reconciliation complete.", expiringTabInformation);
  }

  function findBestMatchInOldInfo(url, oldTabInfo, reconciledOldIds) {
    if (!url) return null;
    for (const oldId in oldTabInfo) {
      if (!reconciledOldIds.has(oldId) && oldTabInfo[oldId][kURLKey] === url) {
        return oldId;
      }
    }
    return null;
  }

  // --- Event Handlers & Core Logic ---

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "updateBadge") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          setBadgeAndTitle(tabs[0].id);
        }
      });
    } else if (alarm.name === "checkExpiration") {
      const currentTime = DateTime.now();
      Object.keys(expiringTabInformation).forEach((tabId) => {
        const tabInformation = expiringTabInformation[tabId];
        if (tabInformation[kExpirationKey] === kForeverTab) {
          return;
        }
        const expirationTime = DateTime.fromISO(tabInformation[kExpirationKey]);
        if (currentTime >= expirationTime) {
          chrome.tabs.remove(Number(tabId)).catch(() => {});
        }
      });
    } else if (alarm.name === "cleanupExpiredTabs") {
      const oneDayAgo = DateTime.now().minus({ days: 1 });
      let changed = false;
      Object.keys(expiringTabInformation).forEach((tabId) => {
        const tabInfo = expiringTabInformation[tabId];
        if (
          tabInfo &&
          tabInfo[kExpirationKey] &&
          tabInfo[kExpirationKey] !== kForeverTab
        ) {
          const expirationTime = DateTime.fromISO(tabInfo[kExpirationKey]);
          if (expirationTime < oneDayAgo) {
            delete expiringTabInformation[tabId];
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
    if (!tab.id || expiringTabInformation[tab.id]) return;
    if (tab.pinned) {
      setExpirationDateTime(tab.id, tab.title, tab.url, kForeverTab);
      return;
    }
    if (tab.windowId) {
      try {
        const win = await chrome.windows.get(tab.windowId);
        if (win.type === "app") {
          setExpirationDateTime(tab.id, tab.title, tab.url, kForeverTab);
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
    setExpirationDateTime(tab.id, tab.title, tab.url, expirationDateTime);
  }

  async function handleTabUpdated(tabId, changeInfo, tab) {
    if (!tab) return;
    if (tab.pinned) {
      setExpirationDateTime(tab.id, tab.title, tab.url, kForeverTab);
      return;
    }
    const wasForever =
      expiringTabInformation[tabId] &&
      expiringTabInformation[tabId][kExpirationKey] === kForeverTab;
    if (wasForever) {
      const { [kStorageDefaultHours]: defaultExpiry = 12 } =
        await chrome.storage.sync.get(kStorageDefaultHours);
      const expirationDateTime = DateTime.now()
        .plus({ hours: defaultExpiry })
        .toString();
      setExpirationDateTime(tab.id, tab.title, tab.url, expirationDateTime);
      return;
    }
    if (changeInfo.status === "complete" && tab.url) {
      if (expiringTabInformation[tabId]) {
        expiringTabInformation[tabId][kTitleKey] = tab.title;
        expiringTabInformation[tabId][kURLKey] = tab.url;
        await chrome.storage.local.set({
          [kStorageKey]: expiringTabInformation,
        });
      } else {
        const { [kStorageDefaultHours]: defaultExpiry = 12 } =
          await chrome.storage.sync.get(kStorageDefaultHours);
        const expirationDateTime = DateTime.now()
          .plus({ hours: defaultExpiry })
          .toString();
        setExpirationDateTime(tab.id, tab.title, tab.url, expirationDateTime);
      }
    }
    setBadgeAndTitle(tabId);
  }

  function setExpirationDateTime(tabId, tabTitle, tabURL, expirationDateTime) {
    if (!tabId) return;
    expiringTabInformation[tabId] = {
      [kExpirationKey]: expirationDateTime,
      [kTitleKey]: tabTitle,
      [kURLKey]: tabURL,
    };
    chrome.storage.local
      .set({ [kStorageKey]: expiringTabInformation })
      .then(() => setBadgeAndTitle(tabId));
  }

  function removeTab(tabId) {
    delete expiringTabInformation[tabId];
    chrome.storage.local.set({ [kStorageKey]: expiringTabInformation });
  }

  function setBadgeAndTitle(tabId) {
    if (!tabId) return;
    const tabInfo = expiringTabInformation[tabId];
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
