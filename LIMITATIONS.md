# QuadTV Limitations

This document outlines the known limitations and constraints of QuadTV. Understanding these will help set appropriate expectations and explain certain design decisions.

## Table of Contents

1. [Technical Limitations](#technical-limitations)
2. [Platform Requirements](#platform-requirements)
3. [Browser Security Constraints](#browser-security-constraints)
4. [Performance Considerations](#performance-considerations)
5. [Design Trade-offs](#design-trade-offs)
6. [Future Considerations](#future-considerations)

---

## Technical Limitations

### 1. Audio Focus Quirks

**What works**: One stream has audio, the others are muted. Click a stream's number badge, press `1`–`4`, or use the arrow keys to move audio focus. `Alt+M` mutes everything.

**How**: The tiles are not cross-origin. The page and every tile are `https://tv.youtube.com`, so a small content script (`content/frameAgent.js`, injected with `all_frames`) runs inside each tile and sets `muted` on the tile's `<video>` element directly. The top frame talks to it with `postMessage` and an explicit origin. See `docs/frame-agent.md` and ADR-005.

**Quirks you may notice**:
- YouTube TV's own speaker icon inside a muted tile may show it as unmuted. The tile badge is the source of truth.
- YouTube TV's ad player unmutes the element at ad boundaries. The agent reverts that on `volumechange` and re-asserts once a second, so you may hear a brief blip rather than a tile staying loud.
- Keys pressed while a tile has focus go to YouTube TV, not to QuadTV. Hold `Alt` (Option on macOS) with the same keys, or click a badge first.
- Unmuting is done by script. Firefox's autoplay policy could pause a stream that is unmuted without a gesture inside that frame; the agent calls `play()` afterwards as a nudge.

**History**: Versions before 1.0 documented this as impossible due to cross-origin restrictions. The actual blocker was that the main content script only ran in the top frame, and the old attempt depended on YouTube's volume-button selector.

---

### 2. No Synchronized Playback

**Limitation**: Streams do not play in sync.

**Why**:
- Each stream is an independent YouTube TV session
- Each stream has its own buffer, latency, and playback position
- The frame agent can mute and unmute, but does not try to seek or align playback

**Impact**:
- Live sports events may have slight delays between streams
- Spoilers possible if one stream is ahead
- Cannot pause all streams simultaneously

**Note**: This is consistent with YouTube TV's normal behavior. Even on the same network, different devices often have 5-30 second variations.

---

### 3. No Stream URL Persistence

**Limitation**: QuadTV does not remember which channels you loaded in each stream.

**Why**: Design decision to keep initial version simple and privacy-focused.

**Impact**:
- Each time you activate QuadTV, streams start at YouTube TV home
- You must manually navigate to channels each session
- No "quick reload" of your favorite channel setup

**Within a session**: A stream hidden by a smaller layout is unloaded (so it stops playing) and restored to the channel it was on when a larger layout brings it back. The agent inside the tile reports its URL to the top frame for this.

**Future**: Layout presets (with saved channel URLs) are planned but not yet implemented. Backend infrastructure exists in `StorageManager`, but UI is not built.

---

### 4. Firefox Only

**Limitation**: QuadTV only works on Firefox browsers.

**Why**:
- Developed using Firefox WebExtensions API
- Uses `browser.*` namespace (Firefox standard)
- Not yet ported to Chrome's `chrome.*` namespace

**Impact**:
- Chrome, Edge, Brave users cannot use QuadTV
- No cross-browser support

**Future**: Chrome/Edge support possible but requires:
- Manifest v3 migration
- API namespace changes
- Testing across multiple browsers

---

## Platform Requirements

### YouTube TV Subscription Required

**Limitation**: QuadTV only works with active YouTube TV subscriptions.

**Why**:
- Each stream loads `tv.youtube.com` which requires authentication
- YouTube TV is a paid service
- QuadTV cannot bypass YouTube TV's authentication

**Impact**:
- Free users cannot use QuadTV (no free tier for YouTube TV)
- Each stream counts as a device/session (check your plan's concurrent stream limit)

**YouTube TV Limits**:
- Most plans allow 3 concurrent streams
- 4K Plus add-on allows unlimited concurrent streams
- QuadTV uses 2-4 streams depending on layout

⚠️ **Important**: Using QuadTV with 4 streams may exceed your YouTube TV plan limits. Check your subscription details.

---

### Works Only on tv.youtube.com

**Limitation**: QuadTV does not work on:
- Regular YouTube (youtube.com)
- YouTube Music
- YouTube Kids
- YouTube Studio
- Other Google services

**Why**: Extension is scoped specifically to `tv.youtube.com` in manifest permissions.

**Impact**:
- Toolbar icon disabled on other sites
- No multi-view for regular YouTube videos

**Design Decision**: Intentionally focused on YouTube TV use case (sports, news, live TV).

---

## Browser Security Constraints

### Iframe Access Is Same-Origin, But Deliberately Narrow

**Reality**: The page and every tile are `https://tv.youtube.com`, so QuadTV *can* run a content script inside each tile. It uses that only for:

- ✅ Setting `muted` on the tile's `<video>` element
- ✅ Reporting the tile's current URL so a hidden tile can be restored
- ✅ Forwarding Alt-modified shortcut keys to the top frame

**Still not done, by choice**:
- ❌ Programmatic navigation or channel changes inside a tile
- ❌ Seeking, pausing, or synchronizing playback
- ❌ Reading anything about the show, account, or DVR
- ❌ Depending on YouTube TV's DOM structure beyond `<video>` elements

The agent only activates in frames whose `window.name` starts with `quadtv-stream-`, which the grid sets. It never runs on YouTube TV's own nested frames or when QuadTV is inactive.

---

### Content Security Policy (CSP)

**Limitation**: QuadTV cannot execute inline scripts or load external resources.

**Why**: Firefox CSP requirements for extensions.

**Impact**:
- All code must be in separate `.js` files
- No CDN dependencies
- No inline `onclick` handlers
- All resources must be bundled with extension

**Benefit**: Enhanced security, no external tracking possible.

---

## Performance Considerations

### Resource Usage

**Limitation**: Multiple streams consume significant resources.

**Resource Impact**:

| Layout | Streams | Est. CPU | Est. RAM | Est. Bandwidth |
|--------|---------|----------|----------|----------------|
| 2-Vertical | 2 | Moderate | ~400 MB | 10-20 Mbps |
| 1+2 | 3 | High | ~600 MB | 15-30 Mbps |
| 2x2 | 4 | Very High | ~800 MB | 20-40 Mbps |

**Why**:
- Each stream is a full YouTube TV player instance
- Video decoding is CPU/GPU intensive
- HD/4K streams use significant memory
- Multiple concurrent streams multiply resource usage

**Recommendations**:
- Use 2-Vertical layout on lower-end hardware
- Close other browser tabs when using QuadTV
- Ensure hardware acceleration enabled in Firefox
- Minimum 8GB RAM recommended for 4 streams
- Broadband internet (25+ Mbps) recommended

---

### Iframe Loading Time

**Limitation**: Streams take time to load after activation.

**Why**:
- Each iframe must load full YouTube TV web app
- YouTube TV initializes video players
- Authentication state must be verified
- Network latency for loading resources

**Impact**:
- 2-5 second delay before streams appear
- May see loading spinners initially
- Slow connections = longer wait times

**Not a Bug**: This is expected behavior for loading multiple full web apps.

---

## Design Trade-offs

### Simplicity vs Feature Richness

**Trade-off**: QuadTV prioritizes reliability over advanced features.

**Chosen**: One focused stream, everything else muted, one action to move focus
**Rejected**: Per-stream volume mixing, hover-to-listen, YouTube-UI-driven control

**Rationale**:
- One rule ("the badge is the source of truth") is easy to predict
- The agent touches only `<video>.muted`, so it survives YouTube TV UI changes
- v0.2.1 removed a heavier attempt that depended on YouTube's volume button; v1.0 brought audio back with a much smaller surface

---

### Visual Grid vs Multi-Window

**Trade-off**: Iframe grid vs separate browser windows.

**Chosen**: Iframe-based visual grid (v0.2.0)
**Rejected**: Multi-tab with window positioning (v0.1.x)

**Rationale** (see ADR-004):
- Visual grid is more intuitive and reliable
- No window management complexity
- Works consistently across OS/monitor configs
- Audio focus arrived in v1.0 via the per-tile frame agent (ADR-005)

---

### Layout Count vs Complexity

**Trade-off**: 3 layouts vs 10+ layout options.

**Chosen**: 3 well-designed layouts (2x2, 1+2, 2-Vertical)
**Rejected**: Complex layout builder with infinite options

**Rationale**:
- Covers 90% of use cases (2, 3, or 4 streams)
- Simple popup UI
- Easy keyboard cycling
- Resizable dividers provide customization

**Future**: Layout presets may allow more combinations.

---

## Future Considerations

### What Might Be Possible Later

#### ✅ Likely Feasible

1. **Layout Presets**
   - Backend ready (`StorageManager`)
   - Just needs popup UI implementation
   - Save channel URLs + layout + sizing

2. **Focus Mode**
   - CSS exists (`quadtv.css:102-107`)
   - Needs click handler and z-index management
   - Temporary maximize single stream

3. **Stream URL Persistence**
   - Could save last 4 URLs per layout
   - Restore on activation
   - Privacy considerations

4. **Dark Mode**
   - Respect system theme
   - Style overlay/popup accordingly

#### ⚠️ Maybe Possible (Requires Research)

5. **Picture-in-Picture Mode**
   - Use browser PiP API
   - One stream in PiP while browsing
   - May conflict with YouTube TV's PiP

6. **Chrome/Edge Support**
   - Manifest v3 port
   - API namespace changes
   - Testing across browsers

#### ✅ Done in 1.0

7. **Audio Focus** - see Technical Limitations #1 and ADR-005

#### ❌ Likely Not Feasible

8. **Synchronized Playback**
   - Requires cross-iframe communication
   - YouTube TV doesn't provide sync APIs
   - Technically infeasible

9. **DVR Control Across Streams**
   - Each stream independent
   - No unified playback control
   - Browser security prevents this

---

## Why These Limitations Exist

### Browser Security Model

The web's security model (Same-Origin Policy) is designed to:
- ✅ Protect user data from malicious sites
- ✅ Prevent cross-site data theft
- ✅ Isolate different websites from each other

**QuadTV respects this model** and works within its constraints rather than trying to circumvent security.

### YouTube TV Platform Constraints

YouTube TV was not designed for:
- Multiple concurrent streams in one browser tab
- Extension-based multi-view interfaces
- Programmatic control by third-party tools

**QuadTV works with YouTube TV's existing interface**, not against it.

### Extension Capabilities

Browser extensions can:
- ✅ Manipulate DOM of current page
- ✅ Create visual overlays
- ✅ Inject content scripts into frames of permitted hosts (how audio focus works)
- ✅ Manage browser state

Browser extensions cannot:
- ❌ Break cross-origin security
- ❌ Access other domains' data
- ❌ Control cross-origin iframes
- ❌ Bypass platform authentication

---

## Philosophy

QuadTV is built on the principle:

> **"Work within constraints, not against them."**

Rather than fighting browser security or attempting unreliable workarounds:
- We keep the in-tile script tiny and limited to `<video>.muted`
- We focus on reliable visual grid layout
- We persist user preferences locally
- We provide simple, predictable behavior

This makes QuadTV:
- ✅ Reliable and stable
- ✅ Secure and privacy-respecting
- ✅ Easy to understand and use
- ✅ Maintainable long-term

---

## Questions?

**Technical questions**: See [CLAUDE.md](CLAUDE.md) for architecture details

**Usage questions**: See [USER-GUIDE.md](USER-GUIDE.md) for how-to guides

**Feature requests**: Open an issue at [https://github.com/Jimbo1167/quadtv/issues](https://github.com/Jimbo1167/quadtv/issues)

Remember: These limitations are **by design**, not bugs. They ensure QuadTV remains secure, reliable, and maintainable.
