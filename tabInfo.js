import { DateTime } from "./lib/luxon.js";

import { kExpirationKey, kURLKey, kTitleKey, kStorageKey } from "./common.js";

chrome.storage.local.get({ [kStorageKey]: {} }, (storedData) => {
  const expiringTabInformation = storedData[kStorageKey];
  Object.keys(expiringTabInformation).forEach((tabId) => {
    const tabInformation = expiringTabInformation[tabId];
    console.log(tabInformation);
    const row = document.createElement("tr");
    let link = `<a href="${tabInformation[kURLKey]}">${tabInformation[kTitleKey]}`;
    if (tabInformation[kURLKey] === undefined) {
      link = `${tabInformation[kTitleKey]}`;
    }
    const rowFor = (tabId) => `tab-${tabId}`;
    function deleteTab(tabId) {
      console.log(`Meaning to delete ${tabId}`);
      delete expiringTabInformation[tabId];
      chrome.runtime.sendMessage({ deleteTab: { tabId } });
      document.getElementById(rowFor(tabId)).remove();
    }
    const buttonId = `delete-${tabId}`;
    const formatted = DateTime.fromISO(
      tabInformation[kExpirationKey]
    ).toLocaleString(DateTime.DATETIME_MED);
    row.innerHTML = `
      <td>${tabId}</td>
      <td class='link'>${link}</a></td>
      <td>${formatted}</td>
      <td>
        <button id='${buttonId}' class='delete'>&#10060;</button>
      </td>
    `;
    row.id = rowFor(tabId);
    const tableBody = document.getElementById("tabInfoTable");
    tableBody.appendChild(row);
    document.getElementById(buttonId).addEventListener("click", () => {
      deleteTab(tabId);
    });
  });
});
