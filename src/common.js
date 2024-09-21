export {
  kStorageKey,
  kRecentlyDeleted,
  kExpirationKey,
  kForeverTab,
  kTitleKey,
  kURLKey,
  kStorageDefaultHours,
  stillExists,
  findMatchingTabIdForURL,
  refreshWithOldInfo,
};

const kStorageKey = "expiryTabInformation";
const kRecentlyDeleted = "expiredTabInformation";
const kExpirationKey = "expirationDate";
const kForeverTab = "forever";
const kTitleKey = "tabTitle";
const kURLKey = "tabURL";
const kStorageDefaultHours = "best-before-default-hours";

const stillExists = (tabId, allTabs) =>
  allTabs.some((tab) => `${tab.id}` === tabId);

const findMatchingTabIdForURL = (url, allTabs) => {
  console.info(
    `Looking for matching tab among those existing, with url ${url}`,
  );
  console.log(allTabs);
  for (const tab of allTabs) {
    if (tab.url == url) {
      console.info(`Found existing tab with id ${tab.id}`);
      return tab.id;
    }
  }
  return null;
};

const refreshWithOldInfo = (tabId, existingTabs, expiringTabInformation) => {
  console.info(`Refreshing tab ${tabId} if possible`);
  if (!stillExists(tabId, existingTabs)) {
    console.info(`Tab with id ${tabId} no longer exists`);

    console.debug(expiringTabInformation);
    const tabInformation = expiringTabInformation; // The eff? [tabId]
    if (!tabInformation) {
      console.info("No info available: ");
      console.log(tabInformation);
      return true;
    }
    const newId = findMatchingTabIdForURL(
      tabInformation[kURLKey],
      existingTabs,
    );
    //chrome.runtime.sendMessage({
    /* After a month from adding reconciliation, I have found it does not work well and I suspect there is some 
      sort of race condition / strange situation between when tabs exist or not after a Chrome update. I think
      removing this deletion could potentially help, at least in debugging the scenario */
    //deleteTab: { tabId },
    //});
    if (!newId) {
      // This line will need visual refresh in the tab info panel
      //console.log("Sending increment message");
      // For some reason this message never makes it (errors instead)
      //chrome.runtime.sendMessage({
      //  incrementTab: { tabId },
      //});
      return true;
    } else {
      console.info(
        `Reconciling new tab with id ${newId} matching no-longer existing tab with id ${tabId}`,
      );
      const tabTitle = tabInformation[kTitleKey];
      const tabURL = tabInformation[kURLKey];
      const chosenDateTime = tabInformation[kExpirationKey];
      chrome.runtime.sendMessage({
        setExpiration: { tabId: +newId, tabTitle, tabURL, chosenDateTime },
      });
    }
  }
};
