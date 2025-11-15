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

### 1. Manual Audio Control Only

**Limitation**: QuadTV cannot automatically switch audio between streams.

**Why**:
- YouTube TV runs inside iframes from a different origin (`tv.youtube.com`)
- Browser security (CORS - Cross-Origin Resource Sharing) prevents extensions from:
  - Accessing iframe content from different domains
  - Controlling video/audio elements inside cross-origin iframes
  - Detecting playback state in cross-origin contexts

**Impact**:
- Users must manually control audio in each stream
- No "one-click audio switch" between streams
- No visual indicators for which stream has audio active

**Workaround**:
- Use `Alt+M` keyboard shortcut to mute all streams
- Manually unmute your preferred stream using YouTube TV's controls
- Keep other streams muted by default

**Why We Don't Use PostMessage**:
We explored PostMessage-based communication with iframes, but:
- Requires YouTube TV to accept messages (they don't)
- Would need content script injection into cross-origin iframes (blocked)
- Even if possible, would be fragile (breaks if YouTube TV changes)

**Alternative Considered**: Multi-tab architecture with browser-level tab muting
- **Tried in v0.1.x**: Used multiple browser windows positioned on screen
- **Why Abandoned**:
  - Poor UX (windows could be covered/moved)
  - Window positioning unreliable across OS and monitor configs
  - Tab management complex and error-prone
  - Iframe approach provides better visual grid (see ADR-004)

---

### 2. No Synchronized Playback

**Limitation**: Streams do not play in sync.

**Why**:
- Each stream is an independent YouTube TV session
- No cross-iframe communication possible (see #1)
- Each stream has its own buffer, latency, and playback position

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

### Cross-Origin Iframe Restrictions

**Limitation**: Cannot access or control content inside YouTube TV iframes.

**Blocked Actions**:
- ❌ Reading iframe DOM
- ❌ Controlling video/audio elements
- ❌ Detecting playback state
- ❌ Reading current channel/show
- ❌ Programmatic navigation
- ❌ Injecting scripts into iframes

**Why**:
- Same-Origin Policy (SOP) - fundamental web security model
- Cross-Origin Resource Sharing (CORS) - prevents data leaks
- YouTube TV doesn't send `X-Frame-Options: ALLOWALL`

**What QuadTV CAN Do**:
- ✅ Create iframes pointing to `tv.youtube.com`
- ✅ Position and size iframes
- ✅ Show/hide iframes
- ✅ Manage the grid container
- ✅ User can click inside iframes to interact normally

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

**Chosen**: Simple, manual audio control
**Rejected**: Complex audio coordination with potential failures

**Rationale**:
- Users prefer predictable manual control
- Complex audio switching was unreliable (v0.2.1 decision)
- Reduced codebase from 1,200 → 352 lines in UIManager

---

### Visual Grid vs Multi-Window

**Trade-off**: Iframe grid vs separate browser windows.

**Chosen**: Iframe-based visual grid (v0.2.0)
**Rejected**: Multi-tab with window positioning (v0.1.x)

**Rationale** (see ADR-004):
- Visual grid is more intuitive and reliable
- No window management complexity
- Works consistently across OS/monitor configs
- Trade-off: Manual audio control (acceptable)

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

#### ❌ Likely Not Feasible

7. **Automatic Audio Switching**
   - Blocked by CORS
   - Would require YouTube TV cooperation
   - Not happening without official API

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
- ✅ Inject content scripts (same-origin)
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
- We embrace manual audio control
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
