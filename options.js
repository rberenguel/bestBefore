const defaultHoursSelector = document.getElementById("default-hours");

chrome.storage.sync.get(["best-before-default-hours"], (data) => {
    const savedValue = data["best-before-default-hours"];
    const defaultValue = 12; 
    const initialValue = savedValue && savedValue !== '' ? savedValue : defaultValue;
    defaultHoursSelector.value = initialValue;
  });

  defaultHoursSelector.addEventListener("change", function(event) {
    event.preventDefault(); 
    const newValue = defaultHoursSelector.value;
    chrome.storage.sync.set({ "best-before-default-hours": newValue }, function() {
      if (chrome.runtime.lastError) {
        console.error("Error saving settings:", chrome.runtime.lastError);
      } else {
        console.log("Settings saved successfully!");
      }
    });
  });