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
