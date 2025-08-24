# ADR: Using URLs as Primary Keys for Tab Expiration

**Date:** 2025-07-14

**Status:** Implemented

## Context

The extension was previously using the transient tab ID as the primary key for storing expiration information. This approach was fragile and would fail when Chrome restarted, as tab IDs are not preserved across sessions. This resulted in the loss of all expiration data for open tabs.

The existing reconciliation logic, which attempted to match tabs by URL on startup, was complex and unreliable, especially in cases of hard browser restarts (e.g., after an update).

## Decision

We decided to refactor the storage system to use a base64-encoded URL as the primary key for storing tab expiration information. This makes the storage independent of the transient tab ID and robust to browser restarts.

## Consequences

### Advantages

- **Robustness:** The extension now correctly preserves tab expiration information across browser restarts.
- **Simplicity:** The complex and unreliable reconciliation logic has been completely removed, simplifying the codebase.
- **Reliability:** Using the URL as the primary key is a more reliable way to identify a tab's expiration information.

### Changes

The following changes were made to the codebase:

- **`common.js`**:

  - A new function, `urlToKey`, was added to generate a base64-encoded key from a URL.
  - The `findMatchingTabIdForURL` function was removed as it was no longer needed.

- **`background.js`**:

  - All storage interactions were updated to use the new URL-based keys.
  - The `handleTabCreated`, `handleTabUpdated`, `removeTab`, and `setExpirationDateTime` event handlers were updated to operate on URLs instead of tab IDs.
  - The complex and failing reconciliation logic was entirely removed.
  - The `checkExpiration` alarm was updated to close tabs by URL.

- **`popup.js`**:

  - The code was updated to use the tab's URL to get and set expiration information.

- **`tabInfo.js`**:
  - The tab list is now built by reading from the new storage schema.
  - The "Switch to tab" functionality was updated to find tabs by URL.
  - The "Delete" functionality was updated to delete tabs by URL.
