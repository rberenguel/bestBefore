import { kStorageDefaultHours } from "./common.js";

const defaultHoursSelector = document.getElementById("default-hours");

chrome.storage.sync.get([kStorageDefaultHours], (data) => {
  const savedValue = data[kStorageDefaultHours];
  console.info("Saved default value")
  console.debug(savedValue);
  const defaultValue = 12;
  const initialValue =
    savedValue && savedValue !== "" ? savedValue : defaultValue;
  defaultHoursSelector.value = initialValue;
});

defaultHoursSelector.addEventListener("change", function (event) {
  event.preventDefault();
  const newValue = defaultHoursSelector.value;
  chrome.storage.sync.set({ [kStorageDefaultHours]: newValue }, function () {
    if (chrome.runtime.lastError) {
      console.error("Error saving settings:", chrome.runtime.lastError);
    } else {
      console.info("Settings saved successfully!");
    }
  });
});
