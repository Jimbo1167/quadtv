# Changelog

All notable changes to QuadTV will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-22

### Added
- 🔊 **Audio focus** - one stream has sound, the rest are muted, and moving it is one action:
  - Click a stream's number badge, press **1-4**, or use the **arrow keys**
  - Stream 1 starts with audio; **Alt+M** still mutes everything
  - Hold **Alt/Option** with the same keys when you have clicked inside a stream
- **On-grid layout bar** - hover the handle at the top edge to switch layouts, see which stream has audio, open help, or exit, without the popup
- **L** cycles layouts (Ctrl/Cmd+Space still works, but collides with Spotlight on macOS)
- Hidden streams stay loaded and muted for 90 seconds so switching back is instant, then unload; they come back on the channel they were on
- Audio focus follows: if the stream with sound gets hidden by a smaller layout, sound moves to stream 1
- Layout changes made in-page are persisted so the popup shows the right selection
- Build stamp (version, branch, commit, build time) in the popup footer, the `?` help overlay and the console

### Fixed
- Switching layouts from the popup while QuadTV was active silently did nothing
- The 1+2 layout's large stream did not span both rows
- Streams hidden by a smaller layout kept playing audio
- Custom divider positions were not applied when switching into a layout
- Option+M on macOS arrived as a special character and never matched

### Changed
- Audio is no longer manual. A small content script runs inside each stream (they share the tv.youtube.com origin) and owns that stream's video element, reverting the ad player's unmutes as they happen
- Streams hidden by the layout you activate with are not loaded at all

### Internal
- Manifest declares `data_collection_permissions: { required: ["none"] }` (required by AMO since 2025-11 for new extensions and for all extensions in 2026)
- New `content/frameAgent.js` injected with `all_frames`; parent and tiles talk over `postMessage` with an explicit origin
- Regression tests now load the real `BackgroundController` and `UIManager` classes (146 tests)
- ADR-005 records the frame agent decision; `docs/frame-agent.md` describes the protocol

## [0.3.9] - 2025-11-15

### Fixed
- Removed non-functional dev mode version badge
- Cleaned up UI elements that were not fully implemented

### Documentation
- Added comprehensive reviewer notes for AMO submission
- Added MIT License
- Updated marketing and listing content

## [0.3.5] - 2025-11-14

### Fixed
- Fixed deactivate button not showing in popup after activation
- Improved popup state synchronization with extension state

## [0.3.4] - 2025-11-13

### Added
- **Reset Grid Sizing** button in popup to restore default stream proportions
- Ability to reset all customized divider positions with one click

## [0.3.3] - 2025-11-12

### Removed
- Removed non-functional preset UI elements (backend exists, UI incomplete)

### Fixed
- Fixed divider drag functionality to work reliably across all layouts

## [0.3.0] - 2025-11-10

### Added
- ✨ **Resizable Grid Dividers** - Major new feature!
  - Drag vertical and horizontal dividers to customize stream sizes
  - Real-time grid resizing using CSS Grid fractional units
  - Settings automatically persist to localStorage
  - Works across all three layouts (2x2, 1+2, 2-vertical)
- Visual divider handles with hover states
- Grid ratio persistence per layout

### Changed
- Extended UIManager to handle divider drag events
- Updated StorageManager to save/load grid ratios

## [0.2.1] - 2025-10-08

### Changed
- **Major Simplification**: Removed all automated audio control code
  - Eliminated IframeBridge and MessageProtocol (cross-origin restrictions made them unreliable)
  - Users now control audio manually within each stream
  - Reduced UIManager from 1,200 lines to 352 lines
- Changed layout from "1+3" to "1+2" (3 streams instead of 4)
  - Better variety: 2-vertical (2 streams), 1+2 (3 streams), 2x2 (4 streams)

### Fixed
- Fixed 2-vertical layout registering correct number of iframes
- Fixed layout selection flow (popup → background → UI)

### Improved
- Enhanced popup layout selection with better visual feedback
- Simplified stream containers (removed audio indicators, kept stream numbers)
- Updated keyboard shortcuts and onboarding help

## [0.2.0] - 2025-09-28

### Added
- Iframe-based visual grid architecture (replaced multi-tab approach)
- Three layout options:
  - 2x2 Grid (4 streams)
  - 1+3 Layout (1 large + 3 small streams)
  - 2-Vertical (2 side-by-side streams)
- CSS Grid-based responsive layouts
- Layout selection popup interface
- Keyboard shortcuts:
  - `Esc` - Exit QuadTV
  - `Ctrl/Cmd+Space` - Cycle layouts
  - `?` - Show help overlay

### Changed
- **Architecture Decision**: Committed to iframe approach after prototyping multi-tab
  - Better UX with visual grid
  - Simpler activation/deactivation
  - No window manipulation required
  - Trade-off: Manual audio control due to cross-origin restrictions

### Removed
- Multi-tab architecture (abandoned after ADR-004 decision)
- Browser window positioning code
- Multi-tab coordination system

## [0.1.0] - 2025-09-15

### Added
- Initial Firefox extension structure
- Core modular architecture:
  - BackgroundController for browser events
  - UIManager for DOM manipulation
  - LayoutEngine for layout definitions
  - StorageManager for settings persistence
  - MessageBus for component communication
  - ContentScript for page interaction
- One-click toolbar activation
- First-time user onboarding tutorial
- Comprehensive test suite (112 tests)
- Message-driven architecture for loose coupling
- Zero external dependencies (pure vanilla JS)

### Development
- Complete architecture decision records (ADRs)
- Comprehensive documentation (CLAUDE.md, BACKLOG.md)
- Development workflow with Jest testing
- Build script for AMO distribution

---

## Version Strategy

- **0.1.x** - Foundation and basic multi-tab architecture
- **0.2.x** - Iframe architecture transition and layout system
- **0.3.x** - Resizable dividers and UI polish
- **1.0.0** - Planned first stable release (when ready for AMO)

## Removed Features

### Audio Control (v0.2.1)
**Why removed**: Browser cross-origin security prevents reliable audio control within YouTube TV iframes. Automated audio switching was unreliable and added significant code complexity without providing consistent value to users.

**Alternative**: Users manually control audio within each stream using YouTube TV's native controls.

### Multi-Tab Architecture (v0.2.0)
**Why removed**: After prototyping (ADR-004), iframe-based visual grid provided better UX despite cross-origin audio limitations. Multi-tab approach required complex window positioning and was harder to use.

### Ctrl+Shift+Q Shortcut (v0.3.6)
**Why removed**: Conflicted with Firefox's "Quit" command on some systems. Users can still activate via toolbar icon or use other shortcuts for layout cycling.

---

## Planned Features

See [BACKLOG.md](BACKLOG.md) for detailed roadmap.

### Under Consideration
- **Focus Mode**: Maximize individual streams (CSS exists, needs implementation)
- **Layout Presets**: Save/load channel configurations (backend ready, UI needed)
- **Stream URL Persistence**: Remember which channels were loaded per layout
- **Dark Mode Support**: Respect system theme preferences

---

## Links

- [GitHub Repository](https://github.com/Jimbo1167/quadtv)
- [Issue Tracker](https://github.com/Jimbo1167/quadtv/issues)
- [Development Backlog](BACKLOG.md)
