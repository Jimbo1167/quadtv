# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuadTV is a Firefox browser extension that enables multi-stream viewing for YouTube TV. It transforms the YouTube TV web interface into a customizable multi-view layout where users can watch multiple channels simultaneously with intuitive audio and stream management controls.

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

## Key Features to Implement
- One-click activation from toolbar icon
- Multiple layout options (2x2, 1+3, 2-Vertical)
- Audio switching with visual indicators (YouTube red border)
- Focus mode for maximizing individual streams
- Layout presets with save/load functionality
- Quick channel swapping within streams

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
- Each component should be independently testable
- Mock the MessageBus for unit testing
- Test iframe manipulation in isolated environments
- Verify YouTube TV integration without affecting production

### Code Organization
- Separate files for each major component
- Shared modules for LayoutEngine and StorageManager
- MessageBus as core communication module
- Clear interfaces between components

## Technical Constraints
- Must work within YouTube TV's existing DOM structure
- **Multi-tab architecture** for stream management (iframe embedding blocked by CSP)
- Memory-conscious tab coordination
- Smooth transitions for tab switching
- No full-page refreshes during mode switching
- Browser-level audio control for reliable muting