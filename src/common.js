export {
  kStorageKey,
  kRecentlyDeleted,
  kExpirationKey,
  kForeverTab,
  kTitleKey,
  kURLKey,
  kStorageDefaultHours,
  stillExists,
  urlToKey,
};

const kStorageKey = "expiryTabInformation";
const kRecentlyDeleted = "expiredTabInformation";
const kExpirationKey = "expirationDate";
const kForeverTab = "forever";
const kTitleKey = "tabTitle";
const kURLKey = "tabURL";
const kStorageDefaultHours = "best-before-default-hours";

const urlToKey = (url) => {
  if (url) {
    return btoa(url);
  }
  return null;
};

const stillExists = (tabId, allTabs) =>
  allTabs.some((tab) => `${tab.id}` === tabId);
