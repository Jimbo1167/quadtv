# Notes for AMO Reviewers

## Extension Overview

**QuadTV** is a Firefox extension that enables multi-stream viewing for YouTube TV (tv.youtube.com). It allows users to watch up to 4 channels simultaneously in customizable layouts.

**Version:** 1.0.0
**License:** MIT License

---

## How to Test

### Prerequisites
1. **YouTube TV subscription required** - This extension only works on tv.youtube.com
2. If you don't have a YouTube TV subscription, you can still verify:
   - Extension loads and activates correctly
   - UI elements are created
   - Permission usage is appropriate
   - No data collection occurs

### Testing Steps

1. **Navigate to YouTube TV**
   - Go to https://tv.youtube.com
   - Log in with a YouTube TV account (if available)

2. **Activate QuadTV**
   - Click the QuadTV toolbar icon
   - The page should transform into a multi-view grid

3. **Test Layout Switching**
   - Click the toolbar icon to open popup
   - Try each layout option:
     - 2x2 (4 equal streams)
     - 1+2 (1 large + 2 small)
     - 2-vertical (2 side-by-side)
   - Each layout should display the correct number of iframes

4. **Test Resizable Dividers**
   - Drag the vertical divider left/right
   - Drag the horizontal divider up/down
   - Dividers should resize streams dynamically
   - Settings should persist after page reload

5. **Test Reset Functionality**
   - Resize some streams
   - Click "Reset Grid Sizing" in popup
   - Grid should return to default proportions

6. **Test Audio Focus** (needs a subscription)
   - After activation only stream 1 should have sound; the others are muted
   - Click stream 3's number badge (top-right of the tile) - sound moves to stream 3 and it gets a red glow
   - Press `2`, or an arrow key, with the page focused - focus moves again
   - Press `Alt+M` - everything mutes

7. **Deactivate**
   - Click toolbar icon again
   - Page should return to normal YouTube TV interface

---

## Code Architecture

### Component Structure
- **Background Script** (`background/backgroundController.js`): Handles browser action and cross-component messaging
- **Content Script** (`content/contentScript.js`): Message relay between background and UI
- **UI Manager** (`content/uiManager.js`): Core UI logic, grid creation, divider management, audio focus
- **Frame Agent** (`content/frameAgent.js`): Runs in every `tv.youtube.com` frame (`all_frames: true`) but activates only inside a QuadTV tile, identified by the iframe `name` the grid assigns (`quadtv-stream-N`). It sets `muted` on the tile's `<video>`, reports the tile's URL, and forwards Alt-modified shortcut keys. The top frame and tiles are the same origin and talk over `window.postMessage` with an explicit `targetOrigin`; every message is origin-checked and tagged. Design: `docs/frame-agent.md`, ADR-005.
- **Popup** (`popup/popup.js`): Toolbar popup interface for controls
- **Shared Modules**:
  - `messageBus.js`: Event-driven communication bus
  - `layoutEngine.js`: Layout definitions and configurations
  - `storageManager.js`: LocalStorage wrapper for settings

### Message Flow
```
Popup → Background → Content → UI Manager ⇄ Frame Agent (per tile, postMessage)
   ↓                              ↓
Storage ←────────────────── MessageBus
```

---

## Permissions Justification

### activeTab
**Usage:** Inject content scripts and UI into the current YouTube TV tab
**File:** `background/backgroundController.js:66` - `browser.tabs.sendMessage()`
**Why needed:** Core functionality requires DOM manipulation on the active tab

### tabs
**Usage:** Query active tab URL to verify user is on tv.youtube.com
**File:** `background/backgroundController.js:43` - URL check before activation
**Why needed:** Prevent activation on non-YouTube TV pages, manage browser action state

### storage
**Usage:** Save layout preferences and grid sizing ratios
**Files:**
- `shared/storageManager.js:8-25` - Get/set settings
- `content/uiManager.js:517-532` - Save grid ratios
**Why needed:** Persist user customizations across sessions

### Host Permission: tv.youtube.com
**Usage:** Content scripts only run on YouTube TV. The main scripts run in the top frame; `content/frameAgent.js` is declared with `all_frames: true` so it can run inside the tiles QuadTV creates (which also load tv.youtube.com). It exits immediately unless the frame's `window.name` carries the QuadTV prefix.
**Why needed:** Security best practice - limits extension scope to intended domain only. `all_frames` is what makes per-stream audio focus possible without any additional permission.

**Full justification:** See `PERMISSIONS.md` in source repository

---

## Privacy & Data Collection

### NO Data Collection
QuadTV does **not**:
- ❌ Collect any user data
- ❌ Track browsing history
- ❌ Use analytics or telemetry
- ❌ Connect to external servers
- ❌ Store personal information
- ❌ Access YouTube account data

### Local Storage Only
QuadTV stores **locally only** (never transmitted):
- Layout preference (e.g., "2x2", "1+2", "2-vertical")
- Grid sizing ratios when user drags dividers

**Storage mechanism:** `browser.storage.local` + `localStorage`
**Stored data example:**
```json
{
  "lastLayout": "2x2",
  "gridRatios": {
    "2x2": { "columns": [1, 1], "rows": [1, 1] }
  }
}
```

**Full privacy policy:** See `PRIVACY.md` in source repository

---

## No External Dependencies

### Build Process
- ✅ No npm dependencies in production code
- ✅ No bundlers or transpilers used
- ✅ Pure vanilla JavaScript (ES6)
- ✅ No minification or obfuscation
- ✅ All code is human-readable

### What's in the package
- Source JavaScript files (content, background, popup, shared)
- HTML/CSS for popup interface
- PNG icons (16, 32, 48, 96px)
- manifest.json

**No external resources loaded at runtime**

---

## Source Code Access

**Repository:** https://github.com/Jimbo1167/quadtv
**Build script:** `build.sh` (creates this exact .zip package)
**Tests:** `tests/` directory (not included in distribution)

### Reproducible Build
To verify this package matches the source:
```bash
git clone https://github.com/Jimbo1167/quadtv
cd quadtv
git checkout v1.0.0
./build.sh
# Compare dist/quadtv-1.0.0.zip with submitted package
```

`shared/buildInfo.js` is generated by `build.sh` and records the commit and build time, so that one file differs only in its `builtAt` timestamp. Everything else is byte-identical.

---

## Development Process

This extension was developed with assistance from **Claude Code** (Anthropic's AI coding assistant).

- All code has been reviewed and tested by the developer
- No auto-generated code was included without understanding
- Architecture decisions documented in `CLAUDE.md`
- Full test coverage (146 passing tests)

---

## Known Limitations

1. **YouTube TV Only**: Extension only works on tv.youtube.com (intentional)
2. **Subscription Required**: Requires active YouTube TV subscription
3. **Audio Focus Quirks**: YouTube TV's own speaker icon may not reflect a mute set by QuadTV, and its ad player briefly unmutes at ad boundaries before the agent reverts it
4. **No Synchronized Playback**: Each stream operates independently

These are **design constraints**, not bugs.

---

## Testing Without YouTube TV Subscription

If you don't have access to YouTube TV, you can still verify:

### Functional Tests
1. ✅ Extension loads without errors
2. ✅ Toolbar icon shows correct state
3. ✅ Popup opens and displays controls
4. ✅ Content script injects on tv.youtube.com
5. ✅ Layout switching works
6. ✅ Storage API used correctly
7. ✅ No console errors

### Privacy Tests
1. ✅ No network requests to external servers
2. ✅ No cookies created
3. ✅ No tracking scripts
4. ✅ Storage limited to extension data only

### Code Review
1. ✅ No obfuscated code
2. ✅ No eval() or similar dangerous functions
3. ✅ No remote code execution
4. ✅ Permissions match actual usage

---

## Common Review Questions

**Q: Why do iframes load tv.youtube.com?**
A: Each stream is an independent YouTube TV session. This is the core functionality - allowing multiple channels to play simultaneously.

**Q: Why is this useful?**
A: Sports fans and news watchers want to monitor multiple channels at once. YouTube TV doesn't natively support this - QuadTV fills that gap.

**Q: Does it violate YouTube's ToS?**
A: No. It simply displays multiple instances of tv.youtube.com in iframes within a single tab. Each requires authentication and counts as a normal YouTube TV session.

**Q: Why not use native Picture-in-Picture?**
A: PiP only supports 1-2 videos. QuadTV supports up to 4 with customizable layouts and sizing.

**Q: Is the code obfuscated?**
A: No. All code is vanilla JavaScript, fully readable and auditable.

**Q: Why does one content script use `all_frames: true`?**
A: The streams are iframes that load tv.youtube.com, the same origin as the page. `content/frameAgent.js` runs in those frames so QuadTV can mute and unmute each stream's `<video>` element. It checks `window.name` for the `quadtv-stream-` prefix and does nothing in any other frame. It never navigates, reads account data, or touches YouTube TV's DOM beyond `<video>` elements.

**Q: What is sent over `postMessage`?**
A: Small control messages between the top frame and its own tiles: `SET_MUTED`, `GET_STATE`, and from the tile `READY`, `STATE` (muted/paused flags), `URL` (the tile's current tv.youtube.com URL, used to restore a hidden tile) and `KEY` (an Alt-modified shortcut). Both sides check `event.origin` against `https://tv.youtube.com` and a `source` tag. Nothing leaves the tab.

---

## Contact

If you have questions during review, please comment on the submission or contact via:
- GitHub Issues: https://github.com/Jimbo1167/quadtv/issues

Thank you for reviewing QuadTV!

---

## Quick Test Checklist

- [ ] Extension loads without errors
- [ ] Works only on tv.youtube.com
- [ ] Toolbar icon displays correctly
- [ ] Popup interface functional
- [ ] Layout switching works
- [ ] Grid dividers are draggable
- [ ] Reset button works
- [ ] Only stream 1 has sound after activation; badge click / 1-4 / arrows move it
- [ ] Deactivation works
- [ ] No network requests to external servers
- [ ] No console errors
- [ ] Storage only used for settings
- [ ] All permissions justified
