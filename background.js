import { DateTime }  from  './lib/luxon.js';

chrome.storage.local.get(
  { ["expirationDates"]: {}},
  (storedData) => {
    const expirationDates = storedData["expirationDates"];

    chrome.alarms.create("checkExpiration", { periodInMinutes: 1 });
    chrome.alarms.create("updateBadge", { periodInMinutes: 0.5 });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === "updateBadge") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          console.log(`Updating badge of ${tabs}`)
          setBadgeAndTitle(tabs[0].id)})
      }});

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === "checkExpiration") {
        
        const currentTime = DateTime.now();
        Object.keys(expirationDates).forEach((tabId) => {
          const expirationDate = expirationDates[tabId];
          if(expirationDate == "forever"){
            return;
          }
          const expirationTime = DateTime.fromISO(expirationDate);
          console.log(`Comparing ${expirationTime} with ${currentTime} for ${tabId}`)
          if (currentTime >= expirationTime) {
            console.log(tabId);
            chrome.tabs
              .get(+tabId)
              .then((tab) => {
                console.log(`Closing expired tab: ${tab.title}`);
                chrome.tabs.remove(tab.id);
                delete expirationDates[tabId];
              })
              .catch((error) => {
                console.log("Error getting tab. Purging from list.", error);
                delete expirationDates[tabId];
              });
          }
        });

        chrome.storage.local.set({
          ["expirationDates"]: expirationDates,
        });
      }
    });

    const setExpirationDateTime = (tabId, expirationDateTime) => {
      if (isValidDateTime(expirationDateTime)) {
        expirationDates[tabId] = expirationDateTime;
        Promise.all([
          chrome.storage.local.set({
            ["expirationDates"]: expirationDates,
          }),
        ])
          .then(() => {
            console.log("Expiration date saved successfully.");
            setBadgeAndTitle(tabId);
          })
          .catch((error) => {
            console.log("Error saving data:", error);
          });
      } else {
        console.log("Invalid expiration date format");
      }
    };

    chrome.tabs.onCreated.addListener((tab) => {
      chrome.storage.sync.get(["best-before-default-hours"], (data) => {
        console.log(data);
        const expirationDateTime = DateTime.now();
        const formatted = expirationDateTime.plus({hours: data['best-before-default-hours']}).toString();
        setExpirationDateTime(tab.id, formatted);
      });
      
    });

    const setBadgeAndTitle = (tabId) => {
      let setBadge = false;
      let color = [0, 0, 0, 0];
      const currentTime = DateTime.now();
      const expirationDate = expirationDates[tabId];
      if(expirationDate == "forever"){
        chrome.action.setBadgeBackgroundColor({color: [0, 125, 0, 100]});
        chrome.action.setTitle({tabId: tabId, title: `This tab never expires`});
        chrome.action.setBadgeText({tabId: tabId,  text: `∞`});
        return;
      }
      if(expirationDate){
        console.log(expirationDate)
        const expirationDateTime = DateTime.fromISO(expirationDate);
        console.log(currentTime);
        console.log(expirationDateTime)
        const diffMonths = expirationDateTime.diff(currentTime, 'months').toObject().months;
        const diffDays = expirationDateTime.diff(currentTime, 'days').toObject().days;
        const diffHours = expirationDateTime.diff(currentTime, 'hours').toObject().hours;
        const diffMinutes = expirationDateTime.diff(currentTime, 'minutes').toObject().minutes;
        const diff = expirationDateTime.diff(currentTime, ['months', 'days', 'hours', 'minutes']).toObject()
        console.log(diffMonths)
        console.log(diffDays)
        console.log(diffHours)
        console.log(diffMinutes)
        let count = Math.ceil(diffMonths);
        let abbr = 'M';
        if(diffDays < 31){
          count = Math.ceil(diffDays);
          abbr = 'D';
          if(diffHours < 24){
            count = Math.ceil(diffHours);
            abbr = 'h';
            if(diffMinutes < 60){
              count = Math.floor(diffMinutes);
              abbr = 'm';
            }
            if(diffMinutes < 180){
              setBadge = true;
              if(diffMinutes < 60){
                color = [200, 200, 0, 100];
              }
              if(diffMinutes < 15){
                color = [255, 0, 0, 100];
              }
            }
          }
        }
        if(setBadge){
          chrome.action.setBadgeText({tabId: tabId,  text: `${count}${abbr}`});
          chrome.action.setBadgeBackgroundColor({tabId: tabId, color: color});
        } else {
          chrome.action.setBadgeText({tabId: tabId,  text: ""});
        }
        chrome.action.setTitle({tabId: tabId, title: `Best before: ${diff.months} months, ${diff.days} days, ${diff.hours} hours, ${Math.floor(diff.minutes)} minutes`});
      }
    }

    chrome.tabs.onActivated.addListener((tab) => {
      setBadgeAndTitle(tab.tabId);
    })

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log(request);
      if (request.setExpiration) {
        const { tabId, chosenDateTime } = request.setExpiration;
        console.log(request.setExpiration.chosenDateTime);
        setExpirationDateTime(
          request.setExpiration.tabId,
          request.setExpiration.chosenDateTime
        );
      }
    });
  }
);

function isValidDateTime(dateTimeString) {
  // I know I should validate, but didn't bother so far.
  return true;
}
