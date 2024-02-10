import { DateTime }  from  './lib/luxon.js';

const noExpiryButton = document.getElementById("no-expiry");

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tabId = tabs[0].id; 

  const expirationPicker = document.getElementById("expiration-picker");

  chrome.storage.local.get(["expirationDates"], (items) => {
    console.log(items.expirationDates);
    const expirationTime = items.expirationDates[tabId];
    if (expirationTime && expirationTime != "forever") {
      // Don't judge me
      const expirationDate = DateTime.fromISO(expirationTime);
      expirationPicker.value = expirationDate.toISO().slice(0, 16);
    } else {
      
    }
  });

  expirationPicker.addEventListener("input", () => {
    const chosenDateTime = expirationPicker.value;
    if (chosenDateTime) {
      chrome.runtime.sendMessage({ setExpiration: { tabId, chosenDateTime } });
    }
  });

  noExpiryButton.addEventListener("click", () => {
      chrome.runtime.sendMessage({ setExpiration: { tabId, chosenDateTime: "forever" } });
  });
});
