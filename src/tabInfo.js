import { DateTime } from "../lib/luxon.js";

import {
  kExpirationKey,
  kURLKey,
  kTitleKey,
  kStorageKey,
  kForeverTab,
  urlToKey,
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
  const urlToTabIdMap = new Map();
  existingTabs.forEach((tab) => {
    if (tab.url) {
      urlToTabIdMap.set(tab.url, { id: tab.id, windowId: tab.windowId });
    }
  });

  async function switchToTab(tabURL) {
    console.info(`Switching to tab ${tabURL}`);
    const tabInfo = urlToTabIdMap.get(tabURL);
    if (tabInfo) {
      await chrome.windows.update(tabInfo.windowId, { focused: true });
      await chrome.tabs.update(tabInfo.id, { active: true });
    } else {
      console.warn(`No active tab found for URL: ${tabURL}`);
    }
  }

  chrome.storage.local.get({ [kStorageKey]: {} }, (storedData) => {
    const expiringTabInformation = storedData[kStorageKey];
    // TODO(me) Copied this verbatim from background.js, can I get the common parts out?
    const getRemainingCell = (key) => {
      const currentTime = DateTime.now();
      let expirationDate = undefined;
      if (
        key in expiringTabInformation &&
        kExpirationKey in expiringTabInformation[key]
      ) {
        expirationDate = expiringTabInformation[key][kExpirationKey];
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
            diffMinutes,
          )};'`;
        }
        return `<td class='remaining'><span class='rounded' ${alertColor}>${
          diff.months
        } M, ${diff.days} d, ${diff.hours} h, ${Math.floor(
          diff.minutes,
        )} m</span></td>`;
      }
    };
    Object.keys(expiringTabInformation).forEach((key) => {
      const tabInformation = expiringTabInformation[key];
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
      const rowFor = (key) => `tab-${key}`;
      function deleteTab(key) {
        console.info(`Meaning to delete ${key}`);
        delete expiringTabInformation[key];
        const isNumericKey = !isNaN(key);
        if (isNumericKey) {
          chrome.runtime.sendMessage({ deleteTab: { tabId: key } });
        } else {
          chrome.runtime.sendMessage({
            deleteTab: { tabURL: tabInformation[kURLKey] },
          });
        }
        document.getElementById(rowFor(key)).remove();
      }

      const tabExists = existingTabs.some(
        (t) => t.url === tabInformation[kURLKey],
      );
      if (!tabExists) {
        row.classList.add("nonexistent");
      }
      const deleteButtonId = `delete-${key}`;
      const switchButtonId = `switch-${key}`;
      let formatted = "Does not expire";
      if (tabInformation[kExpirationKey] !== kForeverTab) {
        formatted = DateTime.fromISO(
          tabInformation[kExpirationKey],
        ).toLocaleString(DateTime.DATETIME_MED);
      }

      row.innerHTML = `
      <td><button title='Switch to this tab' id='${switchButtonId}'>Switch</button></td>
      <td class='link'>${link}</a></td>
      <td class='expiry'>${formatted}</td>
      ${getRemainingCell(key)}
      <td>
        <button id='${deleteButtonId}' class='delete'>&#10060;</button>
      </td>
    `;
      row.id = rowFor(key);
      const tableBody = document.getElementById("tabInfoTable");
      tableBody.appendChild(row);
      document.getElementById(deleteButtonId).addEventListener("click", () => {
        deleteTab(key);
      });
      document
        .getElementById(switchButtonId)
        .addEventListener("click", () => {
          switchToTab(tabInformation[kURLKey]);
        });
      const tabInfoTableContainer = document.getElementById(
        "tabInfoTableContainer",
      );
      Sortable.initTable(tabInfoTableContainer);
    });
  });
});

const toggleButton = document.getElementById("toggle-visibility");
if (toggleButton) {
  let areNonexistentVisible = false;
  toggleButton.addEventListener("click", () => {
    areNonexistentVisible = !areNonexistentVisible;
    const nonexistentRows = document.querySelectorAll(".nonexistent");
    nonexistentRows.forEach((row) => {
      row.style.display = areNonexistentVisible ? "table-row" : "none";
    });
  });
}
