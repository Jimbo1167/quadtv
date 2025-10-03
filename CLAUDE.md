# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuadTV is a Firefox browser extension that enables multi-stream viewing for YouTube TV. It transforms the YouTube TV web interface into a customizable multi-view layout where users can watch multiple channels simultaneously with intuitive audio and stream management controls.

**Current Status**: Core multi-tab architecture is fully functional with working audio switching and layout coordination system implemented.

## Architecture

This project follows a modular, message-driven architecture with clear separation of concerns:

### Core Components
- **[E-BG] BackgroundController**: Central nervous system handling browser events, toolbar clicks, keyboard shortcuts, and **multi-tab coordination**
- **[E-UI] UIManager**: Controls overlay UI and visual indicators for the control tab
- **[E-SM] StreamManager**: Manages **multi-tab state**, coordinates audio switching, and handles tab lifecycle
- **[E-LE] LayoutEngine**: Provides layout definitions for tab arrangement and visual coordination
- **[E-POP] PopupManager**: Handles toolbar popup UI, layout selection, and **tab status display**
- **[E-STORE] StorageManager**: Handles data persistence for settings and presets
- **[E-BUS] MessageBus**: Central communication hub enabling loose coupling between components **across multiple tabs**

### Communication Pattern
Components communicate exclusively through the MessageBus to maintain modularity and testability. No direct dependencies between components.

## Key Features Status
- ✅ One-click activation from toolbar icon (WORKING)
- 🚧 Multiple layout options (2x2, 1+3, 2-Vertical) - Code complete, needs testing
- ✅ Audio switching with visual indicators (WORKING)  
- 📋 Focus mode for maximizing individual streams (TODO)
- 📋 Layout presets with save/load functionality (TODO)
- 📋 Quick channel swapping within streams (TODO)

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
- ✅ CSS Grid-based responsive layouts (2x2, 1+3, 2-vertical)
- ✅ Manual audio control via intuitive click-to-switch interface
- ✅ No full-page refreshes during mode switching
- ✅ Cross-browser compatibility without special permissions

## Recent Developments (Latest Session)
- **Architectural Decision**: Committed to iframe-only architecture, abandoned multi-tab approach (ADR-004)
- **Code Cleanup**: Removed all multi-tab specific code and prototyping artifacts
- **Iframe Grid System**: Perfected CSS Grid-based visual layout with manual audio controls
- **Test Quality**: All 107 tests passing with proper cleanup and no memory leaks
- **Production Ready**: Simple, reliable iframe-based architecture ready for daily use