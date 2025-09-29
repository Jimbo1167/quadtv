# ADR-003: Hybrid Iframe-PostMessage Audio Coordination Architecture

## Status
Proposed

## Context

QuadTV has undergone a significant architectural evolution around layout management:

### Previous Approaches Tried

1. **Original Single-Tab Iframe Approach**: Visual grid with 4 YouTube TV iframes
   - ✅ **Pros**: Intuitive UX, single tab management, visual layout control
   - ❌ **Cons**: Cross-origin iframe restrictions prevented audio control

2. **Multi-Tab Window Management Approach**: Separate browser tabs for each stream
   - ✅ **Pros**: Full audio control via browser tab muting, native YouTube TV experience
   - ❌ **Cons**: Required `windows` permission (not available in Firefox), complex tab coordination, poor UX (users expect visual grid)

3. **Current Iframe Visual Grid**: Back to iframe approach for UX
   - ✅ **Pros**: Perfect visual layout, intuitive user experience
   - ❌ **Cons**: No audio control due to iframe sandboxing

### The Core Problem

**User Expectation vs Technical Reality**: Users expect "QuadTV" to show a visual grid with audio control, but web security models make this challenging:

- **Visual Grid**: Requires iframes for clean layout
- **Audio Control**: Requires direct access to video elements (blocked by cross-origin policy)
- **Firefox Compatibility**: Cannot use `windows` permission for automatic tab positioning

### Current State

We have a working visual grid layout that creates the exact UX users expect, but audio switching between streams is broken due to iframe isolation.

## Decision

We will implement a **Hybrid Iframe-PostMessage Audio Coordination Architecture**:

### Architecture Components

1. **Parent Container**: Main QuadTV overlay with CSS Grid layout
2. **Child Iframes**: Each loads YouTube TV with injected content scripts
3. **PostMessage Bridge**: Two-way communication between parent and iframes
4. **Coordinated Audio**: Parent orchestrates which iframe has active audio

### Implementation Plan

```
┌─────────────────────────────────────────┐
│ Parent Window (tv.youtube.com)          │
│ ┌─────────────────────────────────────┐ │
│ │ QuadTV Overlay Container            │ │
│ │ ┌─────────┐ ┌─────────┐             │ │
│ │ │iframe 1 │ │iframe 2 │             │ │
│ │ │  📺     │ │  📺     │             │ │
│ │ │content  │ │content  │             │ │
│ │ │script   │ │script   │             │ │
│ │ └─────────┘ └─────────┘             │ │
│ │ ┌─────────┐ ┌─────────┐             │ │
│ │ │iframe 3 │ │iframe 4 │             │ │
│ │ │  📺     │ │  📺     │             │ │
│ │ │content  │ │content  │             │ │
│ │ │script   │ │script   │             │ │
│ │ └─────────┘ └─────────┘             │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
         ↕ postMessage communication
```

### Technical Implementation

1. **Content Script Injection**: Each iframe gets QuadTV content scripts via `executeScript`
2. **PostMessage Protocol**: Standardized messages for audio coordination
   ```javascript
   // Parent → Iframe
   { type: 'SET_AUDIO_STATE', hasAudio: true, streamIndex: 0 }
   { type: 'MUTE_AUDIO', streamIndex: 1 }

   // Iframe → Parent
   { type: 'AUDIO_STATE_CHANGED', streamIndex: 0, hasAudio: true }
   { type: 'USER_CLICKED_STREAM', streamIndex: 2 }
   ```
3. **Audio Coordination**: Parent maintains authoritative state, delegates control to iframes

### Benefits of This Approach

- **🎯 Perfect UX**: Visual grid layout users expect
- **🔊 Audio Control**: Proper coordination via content script injection
- **🌐 Cross-Browser**: Works in Firefox and Chrome
- **🔧 Maintainable**: Clear separation of concerns
- **📱 Responsive**: CSS Grid handles layout adaptation
- **🎮 Interactive**: Focus mode, hover controls, visual indicators

### Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| PostMessage overhead | Performance | Minimal - only audio events |
| Content script injection failure | Broken audio | Fallback to visual-only mode |
| YouTube TV layout changes | UI conflicts | Robust CSS selectors, iframe isolation |
| Security restrictions tightening | Architecture obsolescence | Monitor web standards, fallback plans |

## Alternatives Considered

### Alternative 1: Return to Multi-Tab Approach
- **Rejected**: Poor UX, Firefox incompatibility, user confusion

### Alternative 2: Browser Tab Capture API
- **Rejected**: Complex implementation, limited browser support, performance impact

### Alternative 3: Accept Visual-Only Grid
- **Rejected**: Core audio switching functionality is essential for QuadTV

### Alternative 4: Native App Approach
- **Rejected**: Outside scope of browser extension, distribution complexity

## Decision Rationale

### Why Hybrid Approach Wins

1. **User-Centric**: Delivers the visual grid experience users expect from "QuadTV"
2. **Technically Feasible**: PostMessage is well-supported and reliable
3. **Maintainable**: Clear architecture with established patterns
4. **Scalable**: Can extend to additional features (channel switching, presets)
5. **Compatible**: Works across modern browsers

### Core Philosophy

> "Optimize for user experience first, then solve the technical challenges"

The multi-tab approach optimized for technical simplicity but delivered poor UX. The hybrid approach optimizes for user experience and solves technical challenges through established web APIs.

## Implementation Steps

1. **Phase 1**: Implement postMessage infrastructure
2. **Phase 2**: Content script injection into iframes
3. **Phase 3**: Audio coordination protocol
4. **Phase 4**: Visual feedback and error handling
5. **Phase 5**: Testing and refinement

## Success Criteria

- [ ] Visual grid layout maintains current functionality
- [ ] Audio switching works reliably between all streams
- [ ] No performance degradation from postMessage communication
- [ ] Cross-browser compatibility maintained
- [ ] User experience feels seamless and intuitive

## Timeline

**Estimated Implementation**: 1-2 development sessions
**Risk Level**: Medium (well-established APIs, clear architecture)

---

**Decision Date**: 2024-09-28
**Status**: Awaiting approval
**Next Review**: After implementation completion