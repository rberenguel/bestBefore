import { DateTime } from "./lib/luxon.js";

import {
  kExpirationKey,
  kStorageKey,
  kTitleKey,
  kURLKey,
  kStorageDefaultHours,
  kForeverTab,
} from "./common.js";

chrome.storage.local.get({ [kStorageKey]: {} }, (storedData) => {
  const expiringTabInformation = storedData[kStorageKey];

  chrome.alarms.create("checkExpiration", { periodInMinutes: 1 });
  chrome.alarms.create("updateBadge", { periodInMinutes: 0.5 });

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
        console.log(
          `Comparing ${expirationTime} with ${currentTime} for ${tabId}`
        );
        if (currentTime >= expirationTime) {
          chrome.tabs
            .get(+tabId)
            .then((tab) => {
              console.log(`Closing expired tab: ${tab.title}`);
              chrome.tabs.remove(tab.id);
              delete expiringTabInformation[tabId];
            })
            .catch((error) => {
              console.log("Error getting tab. Purging from list.", error);
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
          console.log(
            "Expiration date and tab information saved successfully."
          );
          console.log(expiringTabInformation);
          setBadgeAndTitle(tabId);
        })
        .catch((error) => {
          console.log("Error saving data:", error);
        });
    } else {
      console.log("Invalid expiration date format");
    }
  };

  chrome.tabs.onCreated.addListener((tab) => {
    chrome.storage.sync.get([kStorageDefaultHours], (data) => {
      const expirationDateTime = DateTime.now();
      const formatted = expirationDateTime
        .plus({ hours: data[kStorageDefaultHours] })
        .toString();
      setExpirationDateTime(tab.id, tab.title, tab.url, formatted);
      setBadgeAndTitle(tab.id);
    });
  });

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
        console.log(`Setting badge for ${tabId} with ${count}${abbr}`);
        chrome.action.setBadgeText({ tabId: tabId, text: `${count}${abbr}` });
        chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: color });
      } else {
        console.log(`Setting badge for ${tabId} with empty`);
        chrome.action.setBadgeText({ tabId: tabId, text: "" });
      }
      chrome.action.setTitle({
        tabId: tabId,
        title: `Best before: ${diff.months} months, ${diff.days} days, ${
          diff.hours
        } hours, ${Math.floor(diff.minutes)} minutes`,
      });
    }
  };

  chrome.tabs.onUpdated.addListener((tab) => {
    // Seriously one API has an integer and the other an object? Seriously?
    setBadgeAndTitle(tab);
  });

  chrome.tabs.onActivated.addListener((tab) => {
    setBadgeAndTitle(tab.tabId);
  });

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
      console.log("Requested deletion for");
      console.log(request.deleteTab.tabId);
      delete expiringTabInformation[request.deleteTab.tabId];
      Promise.all([
        chrome.storage.local.set({
          [kStorageKey]: expiringTabInformation,
        }),
      ])
        .then(() => {
          console.log("Deleted tab from list");
          console.log(expiringTabInformation);
        })
        .catch((error) => {
          console.log("Error saving data:", error);
        });
    }
  });
});

function isValidDateTime(dateTimeString) {
  // I know I should validate, but didn't bother so far.
  return true;
}
