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
  refreshWithOldInfo
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
      `Looking for matching tab among those existing, with url ${url}`
    );
    for (const tab of allTabs) {
      if (tab.url == url) {
        console.info(`Found existing tab with id ${tab.id}`);
        return tab.id;
      }
    }
    return null;
  };

const refreshWithOldInfo = (tabId, existingTabs, expiringTabInformation) => {
  if (!stillExists(tabId, existingTabs)) {
    console.info(`Tab with id ${tabId} no longer exists`)
    console.debug(expiringTabInformation)
    const tabInformation = expiringTabInformation[tabId]
    const newId = findMatchingTabIdForURL(tabInformation[kURLKey], existingTabs);
    chrome.runtime.sendMessage({
      deleteTab: { tabId }
    });
    if (!newId) {
      // This line will need visual refresh in the tab info panel
      return true;
    } else {
      console.info(`Reconciling new tab with id ${newId} matching no-longer existing tab with id ${tabId}`);
      const tabTitle = tabInformation[kTitleKey];
      const tabURL = tabInformation[kURLKey];
      const chosenDateTime = tabInformation[kExpirationKey];
      chrome.runtime.sendMessage({
        setExpiration: { tabId: +newId, tabTitle, tabURL, chosenDateTime },
      });
    }
  }
}
