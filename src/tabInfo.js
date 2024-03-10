import { DateTime } from "../lib/luxon.js";

import {
  kExpirationKey,
  kURLKey,
  kTitleKey,
  kStorageKey,
  kForeverTab,
  refreshWithOldInfo
} from "./common.js";

function getColorString(value) {
  if (value < 0 || value > 360) {
    return "";
  }

  // Normalize value to 0-1
  const val = value / 360;

  // Interpolate between black, yellow, and red based on normalized value
  let r, g, b;
  if (val >= 0.6) {
    // Black to yellow
    r = Math.floor(val * 200);
    g = Math.floor(val * 255);
    b = 0;
  } else {
    // Yellow to red
    r = 200;
    g = Math.floor(val * 255);
    b = 0;
  }

  return `rgba(${r}, ${g}, ${b}, 1.0)`;
}
chrome.tabs.query({}, (existingTabs) => {
  chrome.storage.local.get({ [kStorageKey]: {} }, (storedData) => {
    const expiringTabInformation = storedData[kStorageKey];
    // TODO(me) Copied this verbatim from background.js, can I get the common parts out?
    const getRemainingCell = (tabId) => {
      const currentTime = DateTime.now();
      let expirationDate = undefined;
      if (
        tabId in expiringTabInformation &&
        kExpirationKey in expiringTabInformation[tabId]
      ) {
        expirationDate = expiringTabInformation[tabId][kExpirationKey];
      }
      if (expirationDate == kForeverTab) {
        return "<td class='remaining'></td>";
      }

      if (expirationDate) {
        const expirationDateTime = DateTime.fromISO(expirationDate);
        const diff = expirationDateTime
          .diff(currentTime, ["months", "days", "hours", "minutes"])
          .toObject();

        const diffMinutes = expirationDateTime
          .diff(currentTime, "minutes")
          .toObject().minutes;
        let alertColor = "";
        if (diffMinutes < 720) {
          alertColor = `style='background-color: ${getColorString(
            diffMinutes
          )};'`;
        }
        return `<td class='remaining'><span class='rounded' ${alertColor}>${
          diff.months
        } M, ${diff.days} d, ${diff.hours} h, ${Math.floor(
          diff.minutes
        )} m</span></td>`;
      }
    };
    Object.keys(expiringTabInformation).forEach((tabId) => {
      const tabInformation = expiringTabInformation[tabId];
      const row = document.createElement("tr");
      let fullTitle = tabInformation[kTitleKey];
      let title = fullTitle;
      if (title.length > 32) {
        title = title.slice(0, 30) + "…";
      }
      let link = `<a title="${fullTitle}" href="${tabInformation[kURLKey]}">${title}`;
      if (tabInformation[kURLKey] === undefined) {
        link = `${tabInformation[kTitleKey]}`;
      }
      const rowFor = (tabId) => `tab-${tabId}`;
      function deleteTab(tabId) {
        console.info(`Meaning to delete ${tabId}`);
        delete expiringTabInformation[tabId];
        chrome.runtime.sendMessage({ deleteTab: { tabId } });
        document.getElementById(rowFor(tabId)).remove();
      }
      function switchToTab(tabId) {
        console.info(`Switching to tab ${tabId}`);
        chrome.tabs.update(+tabId, { active: true });
      }
      if(refreshWithOldInfo(tabId, existingTabs, expiringTabInformation)){
        row.classList.add("nonexistent");
      }
      const deleteButtonId = `delete-${tabId}`;
      const switchButtonId = `switch-${tabId}`;
      let formatted = "Does not expire";
      if (tabInformation[kExpirationKey] !== kForeverTab) {
        formatted = DateTime.fromISO(
          tabInformation[kExpirationKey]
        ).toLocaleString(DateTime.DATETIME_MED);
      }

      row.innerHTML = `
      <td><button title='Switch to this tab' id='${switchButtonId}'>${tabId}</button></td>
      <td class='link'>${link}</a></td>
      <td class='expiry'>${formatted}</td>
      ${getRemainingCell(tabId)}
      <td>
        <button id='${deleteButtonId}' class='delete'>&#10060;</button>
      </td>
    `;
      row.id = rowFor(tabId);
      const tableBody = document.getElementById("tabInfoTable");
      tableBody.appendChild(row);
      document.getElementById(deleteButtonId).addEventListener("click", () => {
        deleteTab(tabId);
      });
      document.getElementById(switchButtonId).addEventListener("click", () => {
        switchToTab(tabId);
      });
      const tabInfoTableContainer = document.getElementById(
        "tabInfoTableContainer"
      );
      Sortable.initTable(tabInfoTableContainer);
    });
  });
});
