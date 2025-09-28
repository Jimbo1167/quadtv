# QuadTV Development Backlog

## Epic 1: Core Viewing Experience (UXR-101, UXR-102, UXR-103)

### Sprint 1: Foundation & Basic Activation
**Goal**: Get basic extension working with toolbar activation

- [ ] **QTV-001**: Implement basic toolbar icon activation
  - Test: Clicking toolbar icon on tv.youtube.com shows/hides overlay
  - Test: Icon is disabled on non-YouTube TV pages
  - Test: State persists correctly across tab reloads

- [ ] **QTV-002**: Create basic 2x2 grid overlay
  - Test: Overlay covers entire viewport
  - Test: Grid shows 4 equal iframe containers
  - Test: Current channel loads in top-left stream
  - Test: Clean deactivation restores original page

- [ ] **QTV-003**: Implement basic iframe stream loading
  - Test: Current YouTube TV URL loads correctly in iframe
  - Test: Each iframe can load different YouTube TV URLs
  - Test: Iframes are isolated and don't interfere with each other

### Sprint 2: Audio Management
**Goal**: Implement audio switching and visual indicators

- [ ] **QTV-004**: Audio switching logic
  - Test: Only one stream has audio active at a time
  - Test: Clicking inactive stream switches audio
  - Test: Audio state persists during layout changes

- [ ] **QTV-005**: Visual audio indicators
  - Test: Active audio stream shows red border
  - Test: Border moves when audio switches
  - Test: Hover shows speaker icon on inactive streams
  - Test: Visual feedback is immediate and clear

- [ ] **QTV-006**: Stream hover controls
  - Test: Controls appear on hover
  - Test: Controls disappear when not hovering
  - Test: Audio button correctly switches active stream
  - Test: Controls don't interfere with video interaction

### Sprint 3: Focus Mode
**Goal**: Single stream maximization

- [ ] **QTV-007**: Focus mode implementation
  - Test: Click expand button maximizes stream
  - Test: Smooth animation to fullscreen
  - Test: Minimize button returns to grid
  - Test: Audio state maintained during focus/unfocus

- [ ] **QTV-008**: Focus mode UI polish
  - Test: Proper z-index management
  - Test: Escape key exits focus mode
  - Test: Focus mode works with all stream positions

## Epic 2: Layout Customization (UXR-201, UXR-203)

### Sprint 4: Multiple Layouts
**Goal**: Support different grid arrangements

- [ ] **QTV-009**: Layout engine implementation
  - Test: Can switch between 2x2, 1+3, 2-vertical layouts
  - Test: Streams maintain content during layout changes
  - Test: CSS grid renders correctly for each layout

- [ ] **QTV-010**: Popup layout selector
  - Test: Popup shows visual layout previews
  - Test: Clicking layout immediately updates grid
  - Test: Current layout is highlighted in popup

- [ ] **QTV-011**: Layout persistence
  - Test: Last used layout is remembered
  - Test: Extension starts with saved layout preference
  - Test: Layout preference syncs across browser restarts

### Sprint 5: Channel Management
**Goal**: Easy channel switching within streams

- [ ] **QTV-012**: Channel selector interface
  - Test: Click channel button opens selector
  - Test: Can search for channels/shows
  - Test: Selecting channel loads only in target stream
  - Test: Selector doesn't disrupt other streams

- [ ] **QTV-013**: YouTube TV integration
  - Test: Can navigate YouTube TV browse pages in iframes
  - Test: Channel switching works with YouTube TV navigation
  - Test: Handles YouTube TV authentication correctly

## Epic 3: Presets & Power User Features (UXR-202)

### Sprint 6: Basic Presets
**Goal**: Save and load stream configurations

- [ ] **QTV-014**: Preset saving
  - Test: Can save current layout + channels as named preset
  - Test: Preset includes layout type and all stream URLs
  - Test: Validation prevents saving with empty name
  - Test: Preset metadata (date, stream count) stored correctly

- [ ] **QTV-015**: Preset loading
  - Test: Loading preset restores exact layout and channels
  - Test: Loading preset activates audio on correct stream
  - Test: Loading preset works when extension is inactive
  - Test: Error handling for missing/corrupted presets

- [ ] **QTV-016**: Preset management
  - Test: Can delete presets with confirmation
  - Test: Preset list shows metadata (date, streams)
  - Test: Presets persist across browser sessions
  - Test: Can have multiple presets with different names

### Sprint 7: Advanced Features
**Goal**: Polish and advanced functionality

- [ ] **QTV-017**: Keyboard shortcuts
  - Test: Ctrl+Shift+Q toggles QuadTV
  - Test: Shortcuts work across all YouTube TV pages
  - Test: Shortcuts can be customized in Firefox settings

- [ ] **QTV-018**: Settings and preferences
  - Test: Can customize audio indicator color
  - Test: Can disable keyboard shortcuts
  - Test: Settings persist across updates
  - Test: Settings reset to defaults option

- [ ] **QTV-019**: Error handling and resilience
  - Test: Graceful handling of YouTube TV page changes
  - Test: Recovery from network errors
  - Test: Proper cleanup on extension disable/uninstall
  - Test: User feedback for error states

## Epic 4: Polish & Performance

### Sprint 8: Performance & UX
**Goal**: Smooth, responsive experience

- [ ] **QTV-020**: Animation and transitions
  - Test: Smooth transitions between layouts
  - Test: Fluid animation for focus mode
  - Test: No janky or delayed UI updates
  - Test: 60fps performance on reasonable hardware

- [ ] **QTV-021**: Memory and resource management
  - Test: Iframes are properly cleaned up on deactivation
  - Test: No memory leaks during extended use
  - Test: Minimal impact on YouTube TV performance
  - Test: Efficient DOM manipulation

- [ ] **QTV-022**: Cross-browser compatibility (Future)
  - Test: Chrome extension compatibility
  - Test: Edge extension compatibility
  - Test: Consistent behavior across browsers

### Sprint 9: Testing & Quality
**Goal**: Comprehensive test coverage and reliability

- [ ] **QTV-023**: Test automation
  - Test: 90%+ unit test coverage
  - Test: Integration tests for all user flows
  - Test: E2E tests for critical paths
  - Test: Performance benchmarks

- [ ] **QTV-024**: Documentation and developer experience
  - Test: Comprehensive README
  - Test: API documentation for components
  - Test: Contribution guidelines
  - Test: Easy local development setup

## Definition of Done

For each story to be considered complete:

1. ✅ Feature implemented according to acceptance criteria
2. ✅ All tests pass (unit, integration, manual)
3. ✅ Code reviewed and follows style guidelines
4. ✅ No console errors or warnings
5. ✅ Works on Firefox latest stable
6. ✅ Manual testing on YouTube TV
7. ✅ Performance impact is minimal
8. ✅ Documentation updated if needed

## Release Planning

- **v0.1.0**: Core viewing experience (Sprints 1-3)
- **v0.2.0**: Layout customization (Sprints 4-5)
- **v0.3.0**: Presets and power features (Sprints 6-7)
- **v1.0.0**: Polish and performance (Sprints 8-9)