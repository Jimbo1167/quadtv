# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuadTV is a Firefox browser extension that enables multi-stream viewing for YouTube TV. It transforms the YouTube TV web interface into a customizable multi-view layout where users can watch multiple channels simultaneously with intuitive audio and stream management controls.

**Current Status**: Core iframe-based architecture is fully functional with three working layouts (2x2, 1+2, 2-vertical). Audio control removed in favor of manual per-stream control.

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

### Communication Pattern
Components communicate exclusively through the MessageBus to maintain modularity and testability. No direct dependencies between components.

## Key Features Status
- ✅ One-click activation from toolbar icon (WORKING)
- ✅ Multiple layout options (2x2, 1+2, 2-Vertical) - FULLY WORKING
- ✅ Resizable grid dividers - FULLY WORKING (per-layout memory, drag to resize, auto-persists)
- ✅ Stream swapping - FULLY WORKING (drag-and-drop to reorder channels)
- ✅ Keyboard shortcuts (Esc to exit, Ctrl/Cmd+Space to cycle layouts, Alt+M to mute all, ? for help)
- ✅ Onboarding tutorial for first-time users
- ✅ Reset grid sizing button in popup
- ❌ Audio switching - REMOVED (users control audio manually per-stream)
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
- ✅ Each component is independently testable (112 tests passing)
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
- ✅ No automated audio control due to cross-origin restrictions (users control per-stream)
- ✅ No full-page refreshes during mode switching
- ✅ Cross-browser compatibility without special permissions

## Recent Developments

### Version 0.4.0 - Current Release
- **Stream Swapping**: Full drag-and-drop functionality to reorder streams
  - Swap button (⇄) appears on hover for easy grabbing
  - Visual feedback with red/green borders during drag
  - Smooth swap animation with green flash on completion
  - Works across all layouts

- **Grid Divider Memory Per Layout**: Fixed major UX issue
  - Each layout (2x2, 1+2, 2-vertical) now saves its own grid ratios
  - Previously all layouts shared ratios causing layout switches to reset sizing
  - Fixed by calling `applyGridRatios()` in `updateGridLayout()` instead of hardcoded defaults

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