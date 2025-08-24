# ADR: Fix Re-expiry and New Tab Issues

**Date:** 2025-07-14

**Status:** Implemented

## Context

Two issues were identified with the extension's behavior:

1.  **Re-expiry Bug:** When a tab's timer expired, the entry was not removed from the storage. This caused a frustrating loop where opening a tab with the same URL would cause it to instantly close because the old, expired timer was still present.
2.  **New Tab Expiration:** New tabs (e.g., `about:blank` or `chrome://newtab`) were being assigned a default expiration time before they had a "real" URL. This is not the desired behavior.

## Decision

We decided to implement the following changes to address these issues:

1.  **Fix Re-expiry Bug:** The `checkExpiration` alarm handler in `background.js` was updated to:

    - Query for all open tabs with the expired URL.
    - Close all of them.
    - Remove the entry from the `expiringTabInformation` object in storage.

2.  **Handle New Tabs:** The `handleTabCreated` and `handleTabUpdated` functions in `background.js` were updated to:
    - Check if a tab's URL is a "new tab" URL (`about:blank` or `chrome://newtab`).
    - If it is, do not assign an expiration date. The expiration is only set when the tab is updated with a "real" URL.

## Consequences

### Advantages

- **No More Re-expiry Loop:** The "instant close" bug is fixed, providing a much better user experience.
- **Correct New Tab Behavior:** New tabs are no longer assigned an expiration date until they are navigated to a real page.

### Changes

The following changes were made to the codebase:

- **`background.js`**:
  - The `checkExpiration` alarm handler was updated to close all tabs with the expired URL and remove the entry from storage.
  - The `handleTabCreated` and `handleTabUpdated` functions were updated to ignore new tabs.
  - A new helper function, `isNewTab`, was added to check for new tab URLs.
  - The `setExpirationDateTime` function was updated to not set an expiration for new tabs.
  - The `setBadgeAndTitle` function was updated to clear the badge for new tabs.
