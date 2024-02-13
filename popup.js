import { DateTime } from "./lib/luxon.js";

import { kExpirationKey, kForeverTab, kStorageKey } from "./common.js";

const noExpiryButton = document.getElementById("no-expiry");
const seeTabInfoButton = document.getElementById("tab-info");
const oneHourButton = document.getElementById("one-hour");
const threeHoursButton = document.getElementById("three-hours");
const oneDayButton = document.getElementById("one-day");
const threeDaysButton = document.getElementById("three-days");
const sevenDaysButton = document.getElementById("seven-days");
const oneMonthButton = document.getElementById("one-month");

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tabId = tabs[0].id;
  const tabTitle = tabs[0].title;
  const tabURL = tabs[0].url;

  const expirationPicker = document.getElementById("expiration-picker");

  chrome.storage.local.get([kStorageKey], (storedData) => {
    const expiringTabInformation = storedData[kStorageKey];
    let expirationTime = undefined;
    if (
      tabId in expiringTabInformation &&
      kExpirationKey in expiringTabInformation[tabId]
    ) {
      expirationTime = expiringTabInformation[tabId][kExpirationKey];
    }
    if (expirationTime && expirationTime != kForeverTab) {
      // Don't judge me
      const expirationDate = DateTime.fromISO(expirationTime);
      expirationPicker.value = expirationDate.toISO().slice(0, 16);
    } else {
    }
  });

  expirationPicker.addEventListener("input", () => {
    const chosenDateTime = expirationPicker.value;
    if (chosenDateTime) {
      chrome.runtime.sendMessage({
        setExpiration: { tabId, tabTitle, tabURL, chosenDateTime },
      });
    }
  });

  noExpiryButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      setExpiration: { tabId, tabTitle, tabURL, chosenDateTime: kForeverTab },
    });
  });

  seeTabInfoButton.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("tabInfoPage.html") });
  });

  oneHourButton.addEventListener("click", () => {
    const expirationDateTime = DateTime.now();
    const formatted = expirationDateTime.plus({ hours: 1 }).toString();
    chrome.runtime.sendMessage({
      setExpiration: { tabId, tabTitle, tabURL, chosenDateTime: formatted },
    });
    window.close();
  });

  threeHoursButton.addEventListener("click", () => {
    const expirationDateTime = DateTime.now();
    const formatted = expirationDateTime.plus({ hours: 3 }).toString();
    chrome.runtime.sendMessage({
      setExpiration: { tabId, tabTitle, tabURL, chosenDateTime: formatted },
    });
    window.close();
  });

  oneDayButton.addEventListener("click", () => {
    const expirationDateTime = DateTime.now();
    const formatted = expirationDateTime.plus({ days: 1 }).toString();
    chrome.runtime.sendMessage({
      setExpiration: { tabId, tabTitle, tabURL, chosenDateTime: formatted },
    });
    window.close();
  });

  // Repeat for remaining buttons:

  threeDaysButton.addEventListener("click", () => {
    const expirationDateTime = DateTime.now();
    const formatted = expirationDateTime.plus({ days: 3 }).toString();
    chrome.runtime.sendMessage({
      setExpiration: { tabId, tabTitle, tabURL, chosenDateTime: formatted },
    });
    window.close();
  });

  sevenDaysButton.addEventListener("click", () => {
    const expirationDateTime = DateTime.now();
    const formatted = expirationDateTime.plus({ days: 7 }).toString();
    chrome.runtime.sendMessage({
      setExpiration: { tabId, tabTitle, tabURL, chosenDateTime: formatted },
    });
    window.close();
  });

  oneMonthButton.addEventListener("click", () => {
    const expirationDateTime = DateTime.now();
    const formatted = expirationDateTime.plus({ days: 31 }).toString();
    chrome.runtime.sendMessage({
      setExpiration: { tabId, tabTitle, tabURL, chosenDateTime: formatted },
    });
    window.close();
  });
});
