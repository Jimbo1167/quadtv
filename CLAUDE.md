# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuadTV is a Firefox browser extension that enables multi-stream viewing for YouTube TV. It transforms the YouTube TV web interface into a customizable multi-view layout where users can watch multiple channels simultaneously with intuitive audio and stream management controls.

**Current Status**: 1.0.0. Core iframe-based architecture is fully functional with three working layouts (2x2, 1+2, 2-vertical). Audio focus works via a per-tile frame agent (ADR-005).

## Architecture

This project follows a modular, message-driven architecture with clear separation of concerns:

### Core Components
- **[E-BG] BackgroundController**: Handles browser events, toolbar clicks, and extension activation/deactivation
- **[E-UI] UIManager**: Creates and manages the iframe grid overlay with dynamic layouts
- **[E-LE] LayoutEngine**: Provides layout definitions (2x2, 1+2, 2-vertical) with stream positioning
- **[E-POP] PopupManager**: Handles toolbar popup UI and layout selection
- **[E-STORE] StorageManager**: Handles data persistence for settings and presets
- **[E-BUS] MessageBus**: Central communication hub enabling loose coupling between components
- **[E-CS] ContentScript**: Bridges communication between background and UI manager
- **[E-FA] FrameAgent**: Runs inside each tile (`all_frames`), owns the tile's `<video>` for mute/unmute, reports URL, forwards Alt-modified keys. Talks to UIManager over `postMessage` (same origin). See `docs/frame-agent.md`, ADR-005

### Communication Pattern
Components communicate exclusively through the MessageBus to maintain modularity and testability. No direct dependencies between components.

## Key Features Status
- ✅ One-click activation from toolbar icon (WORKING)
- ✅ Multiple layout options (2x2, 1+2, 2-Vertical) - FULLY WORKING
- ✅ Resizable grid dividers - FULLY WORKING (drag to resize, auto-persists settings)
- ✅ Keyboard shortcuts (Esc to exit, L or Ctrl/Cmd+Space to cycle layouts, 1-4 and arrows for audio focus, Alt+M to mute all, ? for help; hold Alt inside a tile)
- ✅ On-grid layout bar (hover handle at top edge): layout buttons, audio indicator, help, exit
- ✅ Onboarding tutorial for first-time users
- ✅ Reset grid sizing button in popup
- ✅ Audio focus - one audible stream, move it by badge click / 1-4 / arrows (v1.0, frame agent)
- 📋 Focus mode for maximizing individual streams (TODO)
- 📋 Layout presets with save/load functionality (TODO - backend ready, UI needed)

## Development Guidelines

### Firefox Extension Structure
- Use WebExtensions API (browser.* namespace)
- Implement manifest.json for extension configuration
- Content scripts run in page context for DOM manipulation
- Background scripts handle browser-level events
- Popup scripts manage toolbar popup interface

### Browser Compatibility
- Target Firefox as primary platform
- Use browser.storage.local for data persistence
- Follow Firefox extension security policies

### Testing Strategy
- ✅ Each component is independently testable (146 tests passing; `*.setLayout`, `*.hiddenStreams`, `*.frameMessaging` and `frameAgent` tests load the real classes)
- ✅ MessageBus mocked for unit testing
- ✅ Multi-tab coordination tested in isolated environments  
- ✅ YouTube TV integration verified without affecting production
- ✅ Comprehensive cleanup prevents Jest open handles

### Code Organization
- Separate files for each major component
- Shared modules for LayoutEngine and StorageManager
- MessageBus as core communication module
- Clear interfaces between components

## Technical Constraints & Solutions
- ✅ Works within YouTube TV's existing DOM structure
- ✅ **Iframe visual grid architecture** for stream management - IMPLEMENTED
- ✅ CSS Grid-based responsive layouts (2x2, 1+2, 2-vertical)
- ✅ Tiles are same-origin; a minimal frame agent handles mute/unmute (no other DOM dependence)
- ✅ No full-page refreshes during mode switching
- ✅ Cross-browser compatibility without special permissions

## Recent Developments

### Version 1.0.0 - Current Release
- **Audio focus via frame agent**: `content/frameAgent.js` (all_frames) activates only in tiles named `quadtv-stream-N`; UIManager sends `SET_MUTED` over postMessage and re-sends on `READY`. Ad-player unmutes reverted on `volumechange`. Stream 1 starts audible.
- **Layout switching fixed**: popup `SET_LAYOUT` had no `sender.tab`; background now falls back to the active tab. Stale `1+3` CSS selector renamed to `1+2`.
- **Hidden tiles**: muted immediately and kept loaded for `HIDDEN_UNLOAD_MS` (90s) so switching back is instant, then unloaded to `about:blank`; restored to their last reported URL when shown again. Tiles hidden by the initial layout are never loaded. If the focused stream gets hidden, focus moves to stream 1.
- **In-page layout changes** publish `LAYOUT_CHANGED`; contentScript persists `lastLayout` and tells the background so the popup stays in sync.
- **Build stamp**: `scripts/generate-build-info.js` writes git-ignored `src/shared/buildInfo.js` (runs before dev/start/build/lint and in build.sh). Shown in popup footer, `?` overlay and console.
- **Keyboard**: 1-4 and arrows move audio focus; Alt-modified keys are forwarded from tiles; Option+M on macOS normalized via `event.code`.

### Version 0.3.9
- **Audio Control Removed**: Eliminated all cross-origin audio switching code (IframeBridge, MessageProtocol)
  - Rationale: Cross-origin security prevents reliable iframe audio control
  - Solution: Users manually control audio within each YouTube TV iframe
  - Result: Cleaner codebase (1,200 lines → 352 lines in uiManager.js)

- **Layout System Finalized**:
  - Fixed 2-vertical layout only registering correct number of iframes
  - Changed 1+3 to 1+2 (3 streams instead of 4) for better stream count variety
  - Layouts: 2 streams (2-vertical), 3 streams (1+2), 4 streams (2x2)
  - Layout selection flow now properly passes through popup → background → UI

- **UI Polish**:
  - Improved popup layout selection readability (white text on red background when selected)
  - Simplified stream containers (removed audio indicators, kept stream numbers)
  - Updated keyboard shortcuts and onboarding help

### Resizable Grid Dividers - COMPLETED (v0.3.x)
- **Status**: Fully implemented and working
- **Features**:
  - Horizontal and vertical dividers are draggable
  - Real-time grid resizing using CSS Grid fr units
  - Settings auto-persist to localStorage
  - Reset button in popup to restore defaults
  - Works across all three layouts
- **Documentation**: See `docs/resizable-grid-feature.md` and `docs/resizable-grid-implementation.md`

### Next Potential Features
- **Focus Mode**: CSS exists, needs click handler implementation
- **Layout Presets**: StorageManager ready, needs popup UI for save/load
- **Stream URL Persistence**: Save which channels users loaded per layout