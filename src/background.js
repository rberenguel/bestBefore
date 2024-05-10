import { DateTime } from "../lib/luxon.js";

import {
  kExpirationKey,
  kStorageKey,
  kTitleKey,
  kURLKey,
  kStorageDefaultHours,
  kForeverTab,
  refreshWithOldInfo,
  findMatchingTabIdForURL,
} from "./common.js";

chrome.storage.local.get({ [kStorageKey]: {} }, (storedData) => {
  const expiringTabInformation = storedData[kStorageKey];

  chrome.alarms.create("checkExpiration", { periodInMinutes: 1 });
  chrome.alarms.create("updateBadge", { periodInMinutes: 0.5 });
  chrome.alarms.create("purgeAndRematchTabs", { periodInMinutes: 1 });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "purgeAndRematchTabs") {
      // This is also done when opening the info page.
      console.info("Reconciling existing and expiring tabs");
      chrome.tabs.query({}, (existingTabs) => {
        Object.keys(expiringTabInformation).forEach((tabId) => {
          const tabInformation = expiringTabInformation[tabId];
          refreshWithOldInfo(tabId, existingTabs, tabInformation);
        });
      });
    }
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "updateBadge") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          setBadgeAndTitle(tabs[0].id);
        }
      });
    }
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "checkExpiration") {
      const currentTime = DateTime.now();
      Object.keys(expiringTabInformation).forEach((tabId) => {
        const tabInformation = expiringTabInformation[tabId];
        if (tabInformation[kExpirationKey] == kForeverTab) {
          return;
        }
        const expirationTime = DateTime.fromISO(tabInformation[kExpirationKey]);
        console.debug(
          `Comparing ${expirationTime} with ${currentTime} for ${tabId}`
        );
        if (currentTime >= expirationTime) {
          chrome.tabs
            .get(+tabId)
            .then((tab) => {
              console.info(`Closing expired tab: ${tab.title}`);
              chrome.tabs.remove(tab.id);
              delete expiringTabInformation[tabId];
            })
            .catch((error) => {
              console.error("Error getting tab. Purging from list.", error);
              delete expiringTabInformation[tabId];
            });
        }
      });

      chrome.storage.local.set({
        [kStorageKey]: expiringTabInformation,
      });
    }
  });

  const setExpirationDateTime = (
    tabId,
    tabTitle,
    tabURL,
    expirationDateTime
  ) => {
    if (isValidDateTime(expirationDateTime)) {
      expiringTabInformation[tabId] = {
        [kExpirationKey]: expirationDateTime,
        [kTitleKey]: tabTitle,
        [kURLKey]: tabURL,
      };
      Promise.all([
        chrome.storage.local.set({
          [kStorageKey]: expiringTabInformation,
        }),
      ])
        .then(() => {
          console.info(
            "Expiration date and tab information saved successfully:"
          );
          console.debug(expiringTabInformation);
          setBadgeAndTitle(tabId);
        })
        .catch((error) => {
          console.error("Error saving data:", error);
        });
    } else {
      console.error("Invalid expiration date format");
    }
  };

  chrome.tabs.onCreated.addListener((tab) => {
    chrome.tabs.query(
      { active: true, currentWindow: true, windowType: "app" },
      (tabsInApps) => {
        const tabIds = tabsInApps.map((t) => t.id);
        if (tabIds.includes(tab.id)) {
          console.info(
            `Skipping tab ${tab.id} (${tab.title}, ${tab.url}) because it is part of a Chrome app. Setting it as "forever"`
          );
          setExpirationDateTime(tab.id, tab.title, tab.url, kForeverTab);
          setBadgeAndTitle(tab.id);
          return;
        }
        const reformatted = Object.entries(expiringTabInformation).map(([id, tab]) => {
          return { 
              url: tab[kURLKey],
              id: id
           };
      });
        const existingId = findMatchingTabIdForURL(
          tab.url,
          reformatted
        );
        if (existingId) {
          console.info("This tab already existed, using same expiry")
          const expiration = expiringTabInformation[existingId][kExpirationKey];
          setExpirationDateTime(tab.id, tab.title, tab.url, expiration);
          setBadgeAndTitle(tab.id);
        } else {
          chrome.storage.sync.get([kStorageDefaultHours], (data) => {
            const expirationDateTime = DateTime.now();
            const defaultExpiry =
              data[kStorageDefaultHours] && data[kStorageDefaultHours] !== ""
                ? data[kStorageDefaultHours]
                : 12;
            const formatted = expirationDateTime
              .plus({ hours: defaultExpiry })
              .toString();
            setExpirationDateTime(tab.id, tab.title, tab.url, formatted);
            setBadgeAndTitle(tab.id);
          });
        }
      }
    );
  });

  chrome.tabs.onRemoved.addListener((tab) => {});

  const setBadgeAndTitle = (tabId) => {
    let setBadge = true;
    let color = [0, 0, 0, 0];
    const currentTime = DateTime.now();
    let expirationDate = undefined;
    if (
      tabId in expiringTabInformation &&
      kExpirationKey in expiringTabInformation[tabId]
    ) {
      expirationDate = expiringTabInformation[tabId][kExpirationKey];
    }
    if (expirationDate == kForeverTab) {
      chrome.action.setBadgeBackgroundColor({ color: [0, 125, 0, 100] });
      chrome.action.setTitle({ tabId: tabId, title: `This tab never expires` });
      chrome.action.setBadgeText({ tabId: tabId, text: `∞` });
      return;
    }
    if (expirationDate) {
      const expirationDateTime = DateTime.fromISO(expirationDate);
      const diffMonths = expirationDateTime
        .diff(currentTime, "months")
        .toObject().months;
      const diffDays = expirationDateTime
        .diff(currentTime, "days")
        .toObject().days;
      const diffHours = expirationDateTime
        .diff(currentTime, "hours")
        .toObject().hours;
      const diffMinutes = expirationDateTime
        .diff(currentTime, "minutes")
        .toObject().minutes;
      const diff = expirationDateTime
        .diff(currentTime, ["months", "days", "hours", "minutes"])
        .toObject();
      let count = Math.ceil(diffMonths);
      let abbr = "M";
      if (diffDays < 31) {
        count = Math.ceil(diffDays);
        abbr = "d";
        if (diffHours < 24) {
          count = Math.ceil(diffHours);
          abbr = "h";
          if (diffMinutes < 60) {
            count = Math.floor(diffMinutes);
            abbr = "m";
          }
          if (diffMinutes < 180) {
            setBadge = true;
            if (diffMinutes < 60) {
              color = [200, 200, 0, 100];
            }
            if (diffMinutes < 15) {
              color = [255, 0, 0, 100];
            }
          }
        }
      }
      if (setBadge) {
        console.info(`Setting badge for ${tabId} with ${count}${abbr}`);
        chrome.action.setBadgeText({ tabId: tabId, text: `${count}${abbr}` });
        chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: color });
      } else {
        console.info(`Setting badge for ${tabId} with empty`);
        try {
          chrome.action.setBadgeText({ tabId: tabId, text: "" });
        } catch {
          console.error(`Can't set the badge for tab $tabId`);
        }
      }
      chrome.action.setTitle({
        tabId: tabId,
        title: `Best before: ${diff.months} months, ${diff.days} days, ${
          diff.hours
        } hours, ${Math.floor(diff.minutes)} minutes`,
      });
    }
  };

  chrome.tabs.onUpdated.addListener((tabId) => {
    setBadgeAndTitle(tabId);
    console.debug(`Requesting update for ${tabId}`);
    chrome.tabs.get(tabId, (tab) => {
      const tabId = tab.id;
      const tabTitle = tab.title;
      const tabURL = tab.url;
      expiringTabInformation[tabId][kTitleKey] = tabTitle;
      expiringTabInformation[tabId][kURLKey] = tabURL;
      Promise.all([
        chrome.storage.local.set({
          [kStorageKey]: expiringTabInformation,
        }),
      ])
        .then(() => {
          console.info("Updated URL and title for tab");
          console.debug(expiringTabInformation);
        })
        .catch((error) => {
          console.error("Error saving data:", error);
        });
    });
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    removeTab(tabId);
  });

  chrome.tabs.onActivated.addListener((tab) => {
    setBadgeAndTitle(tab.tabId);
  });

  const removeTab = (tabId) => {
    console.info(`Requested deletion for ${tabId}`);
    delete expiringTabInformation[tabId];
    Promise.all([
      chrome.storage.local.set({
        [kStorageKey]: expiringTabInformation,
      }),
    ])
      .then(() => {
        console.info("Deleted tab from list");
        console.debug(expiringTabInformation);
      })
      .catch((error) => {
        console.error("Error saving data:", error);
      });
  };

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.setExpiration) {
      setExpirationDateTime(
        request.setExpiration.tabId,
        request.setExpiration.tabTitle,
        request.setExpiration.tabURL,
        request.setExpiration.chosenDateTime
      );
    }
    if (request.deleteTab) {
      removeTab(request.deleteTab.tabId);
    }
  });
});

function isValidDateTime(dateTimeString) {
  // I know I should validate, but didn't bother so far.
  return true;
}
