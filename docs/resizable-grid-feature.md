# Feature Design: Dynamic Grid Resizing with Draggable Dividers

**Version:** 0.3.0
**Status:** Design Phase
**Priority:** High
**Complexity:** Medium
**Estimated Time:** 4-6 hours
**Date:** 2025-10-08

---

## Overview

Add draggable divider bars between iframe streams that allow users to dynamically resize the grid layout. Users can adjust the relative size of streams by dragging horizontal or vertical dividers.

## User Experience

### Interaction Model

1. User activates QuadTV with any layout (2x2, 1+2, 2-vertical)
2. Divider bars appear between streams (vertical and/or horizontal based on layout)
3. User hovers over divider → cursor changes to resize cursor (`col-resize` or `row-resize`)
4. User drags divider → grid proportions update in real-time
5. Divider positions persist per-layout in localStorage

### Visual Design

- **Dividers:** 8px wide/tall, semi-transparent (#666 with opacity)
- **Hover state:** Brighter (#ff0000 with glow)
- **Active drag state:** Solid red with visual feedback
- **Min/max constraints:** 20% to 80% to prevent collapsing streams

### Example Use Cases

**2x2 Layout:**
- Enlarge top two streams for main game, shrink bottom two for stats
- Enlarge left two streams, shrink right two streams
- Any custom combination of row/column ratios

**1+2 Layout:**
- Adjust main stream size vs side streams
- Adjust ratio between two small streams

**2-Vertical Layout:**
- Adjust left/right stream ratio

---

## Technical Implementation

### 1. Divider Component Structure

#### Layout-Specific Dividers

**2x2 layout:**
- 1 vertical divider (between left and right columns)
- 1 horizontal divider (between top and bottom rows)

**1+2 layout:**
- 1 vertical divider (between large stream and small streams)
- 1 horizontal divider (between top and bottom small streams, right side only)

**2-vertical layout:**
- 1 vertical divider (between left and right streams)

### 2. Data Structure

```javascript
// Store grid ratios per layout
this.gridRatios = {
  '2x2': {
    columns: [1, 1],  // fr units for each column
    rows: [1, 1]      // fr units for each row
  },
  '1+2': {
    columns: [2, 1],
    rows: [1, 1]
  },
  '2-vertical': {
    columns: [1, 1],
    rows: [1]
  }
};
```

### 3. Core Implementation

#### Step 1: Create Divider Elements

```javascript
createDivider(orientation, index) {
  // orientation: 'vertical' | 'horizontal'
  // index: which divider (for multiple dividers)
  const divider = document.createElement('div');
  divider.className = `quadtv-divider quadtv-divider-${orientation}`;
  divider.dataset.orientation = orientation;
  divider.dataset.index = index;

  // Position using absolute positioning over grid
  // Add drag event listeners
  return divider;
}
```

#### Step 2: Handle Drag Events

```javascript
onDividerDragStart(e, divider) {
  this.isDragging = true;
  this.dragStartPos = orientation === 'vertical' ? e.clientX : e.clientY;
  this.dragOrientation = divider.dataset.orientation;
  this.dragIndex = divider.dataset.index;

  document.addEventListener('mousemove', this.onDividerDrag);
  document.addEventListener('mouseup', this.onDividerDragEnd);
}

onDividerDrag(e) {
  const currentPos = this.dragOrientation === 'vertical' ? e.clientX : e.clientY;
  const delta = currentPos - this.dragStartPos;

  // Convert pixel delta to percentage of container
  const containerSize = this.dragOrientation === 'vertical'
    ? this.gridContainer.offsetWidth
    : this.gridContainer.offsetHeight;

  const percentDelta = (delta / containerSize) * 100;

  // Update grid ratios
  this.updateGridRatios(percentDelta);
  this.applyGridRatios();
}
```

#### Step 3: Update CSS Grid Template

```javascript
applyGridRatios() {
  const layout = this.currentLayout;
  const ratios = this.gridRatios[layout];

  const columnTemplate = ratios.columns.map(r => `${r}fr`).join(' ');
  const rowTemplate = ratios.rows.map(r => `${r}fr`).join(' ');

  this.gridContainer.style.gridTemplateColumns = columnTemplate;
  this.gridContainer.style.gridTemplateRows = rowTemplate;
}
```

#### Step 4: Persist Settings

```javascript
saveGridRatios() {
  localStorage.setItem('quadtv-grid-ratios', JSON.stringify(this.gridRatios));
}

loadGridRatios() {
  const saved = localStorage.getItem('quadtv-grid-ratios');
  if (saved) {
    this.gridRatios = JSON.parse(saved);
  }
}
```

### 4. CSS Styling

```css
.quadtv-divider {
  position: absolute;
  background: rgba(102, 102, 102, 0.3);
  transition: background 0.2s ease;
  z-index: 1000;
}

.quadtv-divider:hover {
  background: rgba(255, 0, 0, 0.5);
  box-shadow: 0 0 8px rgba(255, 0, 0, 0.5);
}

.quadtv-divider.dragging {
  background: #ff0000;
  box-shadow: 0 0 12px rgba(255, 0, 0, 0.8);
}

.quadtv-divider-vertical {
  width: 8px;
  height: 100%;
  cursor: col-resize;
}

.quadtv-divider-horizontal {
  width: 100%;
  height: 8px;
  cursor: row-resize;
}
```

---

## Edge Cases & Constraints

1. **Min/Max Ratios**: Prevent streams from becoming too small
   - Minimum: 0.2fr (20% of space)
   - Maximum: 4fr (80% of space when paired with 0.2fr)

2. **Layout Switching**: Reset to default ratios when switching layouts (with option to preserve)

3. **Divider Positioning**: Calculate divider position based on current ratios
   - Vertical divider at: `(columns[0] / sum(columns)) * 100%`
   - Horizontal divider at: `(rows[0] / sum(rows)) * 100%`

4. **Mobile/Touch Support**: Add touch event handlers for mobile compatibility

5. **Reset Option**: Add button/shortcut to reset to default equal ratios (e.g., double-click divider)

---

## Implementation Plan

### Phase 1: Core Functionality (2-3 hours)
- [ ] Add divider elements to grid container
- [ ] Implement drag event handlers
- [ ] Update grid template on drag
- [ ] Add min/max constraints
- [ ] Test with 2x2 layout only

### Phase 2: Multi-Layout Support (1-2 hours)
- [ ] Add divider logic for 1+2 layout (more complex - 2 dividers)
- [ ] Add divider logic for 2-vertical layout (simple - 1 divider)
- [ ] Handle layout switching (show/hide appropriate dividers)

### Phase 3: Polish & Persistence (1 hour)
- [ ] Add hover/active visual states
- [ ] Implement localStorage persistence
- [ ] Add reset functionality (double-click or button)
- [ ] Add keyboard shortcuts (arrow keys while dragging?)

### Phase 4: Testing (30 min)
- [ ] Test all three layouts
- [ ] Test min/max constraints
- [ ] Test persistence across sessions
- [ ] Test layout switching with custom ratios

---

## Alternatives Considered

1. **CSS Resize Property** - `resize: both` on containers
   - ❌ Limited browser support, poor UX, conflicts with grid

2. **Third-party Library** (Split.js, react-split-pane)
   - ❌ Adds dependency, overkill for this use case

3. **Fixed Preset Sizes** (dropdown with S/M/L options)
   - ❌ Less flexible, requires more UI space

---

## Success Metrics

- Users can resize any stream to desired size within constraints
- Drag interaction feels smooth (60fps)
- Settings persist across browser sessions
- No performance impact on iframe video playback

---

## Decision

**✅ APPROVED** - Proceeding with implementation

This feature:
- Significantly improves UX flexibility
- Is technically straightforward with CSS Grid
- Aligns perfectly with the existing architecture
- Has minimal risk and clear implementation path

The most complex part is the **1+2 layout** where the horizontal divider only affects the right column (small streams), not the left column (large stream). This requires careful grid area management but is still very doable.

---

## Notes

- Start with Phase 1 (2x2 layout only) as proof of concept
- Can iterate based on user feedback before implementing all layouts
- Consider adding visual feedback during drag (show percentage/ratio)
