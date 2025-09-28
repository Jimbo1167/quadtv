# 🧪 QuadTV Multi-Tab Prototype

This prototype tests the multi-tab approach for QuadTV after discovering that YouTube TV blocks iframe embedding.

## What This Tests

1. **Tab Management**: Can we open/close multiple YouTube TV tabs?
2. **Audio Coordination**: Can we mute/unmute tabs selectively?
3. **Cross-Tab Communication**: Can tabs coordinate through the extension?
4. **User Experience**: How does multi-tab feel vs. single overlay?

## Installation & Testing

### 1. Install the Prototype
```bash
# In Firefox, go to: about:debugging
# Click "This Firefox"
# Click "Load Temporary Add-on"
# Navigate to: /Users/jamesschindler/projects/quadtv/prototype/
# Select: manifest.json
```

### 2. Test Process
1. **Navigate to YouTube TV** (tv.youtube.com)
2. **Click the extension icon** (QuadTV Prototype)
3. **Click "Activate QuadTV"** in the popup
4. **Observe**: 3 new YouTube TV tabs should open
5. **Look for**: Red indicators in top-right of each tab
6. **Test**: Click indicators to switch which tab has audio
7. **Verify**: Only one tab should have audio at a time

### 3. What to Watch For

#### ✅ **Success Indicators**
- 3 additional YouTube TV tabs open successfully
- Each tab shows a red indicator: "Stream X - 🔊 AUDIO" or "Stream X - 🔇 MUTED"
- Clicking indicators switches audio between tabs
- Only one tab has audio/video playing at a time
- Console shows debug logs (F12 → Console)

#### ❌ **Potential Issues**
- Tabs fail to open (permission issues)
- Audio switching doesn't work (YouTube TV audio control limitations)
- YouTube TV detects automated behavior
- Performance issues with multiple tabs

### 4. Debug Information

**Check Console Logs** (F12 → Console):
- Background script logs: `🧪 Prototype:` messages
- Content script logs: `📺 Tab:` messages
- Error messages: `❌` messages

**Key Tests**:
- Tab creation: Do all 4 tabs open?
- Audio control: Does muting/unmuting work?
- State coordination: Do tabs know about each other?
- Cleanup: Do extra tabs close on deactivation?

## Expected Results

### 🎯 **If Successful**
- Multi-tab approach is viable
- We can proceed with full implementation
- Audio switching works reliably
- User experience is acceptable

### 🚨 **If Issues Found**
- Document specific problems
- Consider hybrid approaches
- May need alternative audio control methods
- Could explore popup window approach instead

## Architecture Tested

```
Background Script
├── Manages 4 YouTube TV tabs
├── Coordinates audio switching
└── Handles tab lifecycle

Content Scripts (per tab)
├── Shows visual indicators
├── Handles local audio control
└── Communicates with background

Popup Interface
├── Activation/deactivation controls
├── Status display
└── Debug information
```

## Next Steps Based on Results

### ✅ **If Prototype Works**
1. Integrate multi-tab approach into main extension
2. Enhanced UI for tab management
3. Layout coordination between tabs
4. Advanced audio/video controls

### ❌ **If Issues Found**
1. Document specific problems
2. Research alternative approaches
3. Consider popup windows vs. tabs
4. Explore screen capture APIs

## Files Overview

- `manifest.json` - Basic extension permissions for tab management
- `background.js` - Multi-tab coordination logic
- `content.js` - Per-tab behavior and audio control
- `popup.html/js` - Simple test interface
- `README.md` - This testing guide