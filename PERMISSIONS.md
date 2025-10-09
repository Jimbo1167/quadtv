# QuadTV - Permissions Justification

This document explains why QuadTV requests each permission and how it is used.

## Requested Permissions

### 1. `activeTab`

**Purpose:** Access the current YouTube TV tab to inject the QuadTV multi-view grid.

**How It's Used:**
- Inject content scripts (`contentScript.js`, `uiManager.js`, etc.) into the active YouTube TV tab
- Create and manage the multi-view grid overlay
- Display multiple YouTube TV streams in separate iframes
- Handle user interactions (layout changes, divider dragging, grid reset)

**Why It's Needed:**
Without `activeTab`, QuadTV cannot inject its user interface into the YouTube TV page. This permission is essential for the extension's core functionality.

**Data Access:**
- Limited to the active tab only when user clicks the toolbar icon
- Does not provide access to other tabs or browsing history
- Only activates when user explicitly triggers QuadTV

---

### 2. `tabs`

**Purpose:** Query the active tab and manage browser action state based on the current page.

**How It's Used:**
- Check if the current tab is a YouTube TV page (`tv.youtube.com`)
- Prevent activation on non-YouTube TV pages
- Update the browser action icon badge (✓ when active, ❌ when not on YouTube TV)
- Query active tab to send messages between popup and content script
- Toggle QuadTV on/off via keyboard shortcut (Ctrl+Shift+Q)

**Why It's Needed:**
Without `tabs`, QuadTV cannot:
- Verify the user is on a YouTube TV page before activating
- Provide visual feedback about extension state in the toolbar
- Support keyboard shortcuts
- Communicate between extension components

**Data Access:**
- Only queries active tab URL to check for `tv.youtube.com`
- Does not read tab content or browsing history
- Does not track or store URLs

---

### 3. `storage`

**Purpose:** Save user preferences and customizations locally in the browser.

**How It's Used:**
- Save the last selected layout (2x2, 1+2, or 2-vertical)
- Remember custom grid sizing when user drags dividers to resize streams
- Restore user preferences when QuadTV is activated again

**Why It's Needed:**
Without `storage`, QuadTV would reset to default settings every time:
- The browser restarts
- The extension reloads
- The user navigates to a different page

This would create a poor user experience, requiring users to reconfigure their preferred layout and stream sizes repeatedly.

**Data Stored:**
```javascript
{
  "lastLayout": "2x2",           // User's preferred layout
  "gridRatios": {                // Custom stream sizing
    "2x2": {
      "columns": [1, 1],
      "rows": [1, 1]
    },
    "1+2": { ... },
    "2-vertical": { ... }
  }
}
```

**Privacy:**
- All data is stored locally using `browser.storage.local` and `localStorage`
- No data is transmitted to any server
- No personal information is collected
- Data can be cleared by clearing browser storage or clicking "Reset Grid Sizing"

---

### 4. Host Permission: `*://tv.youtube.com/*`

**Purpose:** Restrict QuadTV to only run on YouTube TV pages.

**How It's Used:**
- Allow content scripts to inject only on `tv.youtube.com` URLs
- Ensure QuadTV does not run on other websites
- Access the YouTube TV page DOM to create the multi-view grid

**Why It's Needed:**
This is a security and privacy best practice:
- ✅ Limits extension scope to only the intended website
- ✅ Prevents accidental activation on other sites
- ✅ Reduces potential security risks
- ✅ Provides transparency about where the extension runs

**Data Access:**
- Only accesses DOM elements on `tv.youtube.com`
- Does not access or modify content on any other website
- Does not intercept network requests or user credentials
- Does not read or store YouTube TV content

---

## Summary

QuadTV uses **minimal permissions** required for its core functionality:

| Permission | Purpose | Privacy Impact |
|------------|---------|----------------|
| `activeTab` | Inject multi-view grid | Low - only active tab when triggered |
| `tabs` | Check current URL, update icon | Low - URL check only, no tracking |
| `storage` | Save user preferences | None - local storage only |
| `tv.youtube.com` | Run on YouTube TV only | Low - restricted to one domain |

## No Unnecessary Permissions

QuadTV does **NOT** request:
- ❌ `<all_urls>` - Access to all websites
- ❌ `webRequest` - Intercept network traffic
- ❌ `cookies` - Access user cookies
- ❌ `history` - Access browsing history
- ❌ `bookmarks` - Access bookmarks
- ❌ `downloads` - Access downloads
- ❌ `clipboardWrite` - Modify clipboard
- ❌ Any other sensitive permissions

## Transparency

QuadTV is open source. You can review the complete source code at:
https://github.com/[your-username]/quadtv

Every permission usage is documented and auditable in the codebase.

## Questions?

If you have questions about permissions or privacy, please open an issue:
https://github.com/[your-username]/quadtv/issues
