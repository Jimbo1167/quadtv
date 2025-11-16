# QuadTV User Guide

Welcome to QuadTV! This guide will help you get the most out of multi-stream viewing for YouTube TV.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Usage](#basic-usage)
3. [Keyboard Shortcuts](#keyboard-shortcuts)
4. [Layouts](#layouts)
5. [Resizing Streams](#resizing-streams)
6. [Stream Swapping](#stream-swapping)
7. [Audio Control](#audio-control)
8. [Tips & Tricks](#tips--tricks)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## Getting Started

### Prerequisites

- **Firefox Browser** (latest version recommended)
- **YouTube TV Subscription** ([tv.youtube.com](https://tv.youtube.com))
- QuadTV extension installed from Firefox Add-ons

### First-Time Setup

1. Navigate to [https://tv.youtube.com](https://tv.youtube.com)
2. Log in to your YouTube TV account
3. Click the **QuadTV** toolbar icon (grid icon in your browser toolbar)
4. A tutorial overlay will appear explaining the basics
5. Press `?` anytime to see the help overlay again

---

## Basic Usage

### Activating QuadTV

**Method 1: Toolbar Icon**
- Click the QuadTV icon in your browser toolbar
- The page transforms into a multi-view grid

**Method 2: First-Time Tutorial**
- Follow the on-screen instructions when you first activate

### Navigating Channels

Each stream is an independent YouTube TV session:

1. **Click inside any stream** to interact with it
2. Use YouTube TV's normal navigation to change channels
3. Browse the guide, search for shows, or select from your library
4. Each stream remembers its channel independently

### Deactivating QuadTV

**Method 1: Keyboard**
- Press `Esc` to exit multi-view mode

**Method 2: Toolbar**
- Click the QuadTV toolbar icon again
- Click "Deactivate QuadTV" in the popup

---

## Keyboard Shortcuts

QuadTV includes powerful keyboard shortcuts for quick control:

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Esc** | Exit QuadTV | Returns to normal YouTube TV view |
| **Ctrl+Space** (Mac: **Cmd+Space**) | Cycle Layouts | Rotates through 2x2 → 1+2 → 2-Vertical → 2x2 |
| **Alt+M** | Mute All Streams | Quickly mute all streams at once |
| **?** | Show Help | Display the onboarding tutorial overlay |

### Notes on Shortcuts

- Shortcuts only work when QuadTV is active
- Shortcuts are **disabled** when you're typing in a text field
- `Ctrl+Space` on Mac uses `Cmd+Space` (system spotlight may override)

---

## Layouts

QuadTV offers three customizable layouts:

### 2x2 Grid (4 Streams)
```
┌─────────┬─────────┐
│    1    │    2    │
├─────────┼─────────┤
│    3    │    4    │
└─────────┴─────────┘
```
**Best for**: Monitoring 4 games/channels equally

### 1+2 Layout (3 Streams)
```
┌───────────────┬───┐
│               │ 2 │
│       1       ├───┤
│               │ 3 │
└───────────────┴───┘
```
**Best for**: Main event with 2 secondary streams

### 2-Vertical (2 Streams)
```
┌─────────┬─────────┐
│         │         │
│    1    │    2    │
│         │         │
└─────────┴─────────┘
```
**Best for**: Side-by-side comparison of 2 channels

### Switching Layouts

**Method 1: Popup Menu**
1. Click the QuadTV toolbar icon
2. Select your preferred layout from the visual options
3. Layout changes immediately

**Method 2: Keyboard**
- Press `Ctrl+Space` (or `Cmd+Space` on Mac) to cycle through layouts

---

## Resizing Streams

One of QuadTV's most powerful features is **resizable dividers**:

### How to Resize

1. **Hover over a divider** between streams
   - Your cursor will change to a resize cursor (↔ or ↕)
2. **Click and drag** the divider
   - Horizontal divider: Drag up/down to adjust top/bottom ratio
   - Vertical divider: Drag left/right to adjust left/right ratio
3. **Release** when you're satisfied with the size
4. Settings **automatically save** and persist across sessions

### Visual Feedback

- Dividers have a **subtle border** that becomes more visible on hover
- Cursor changes to indicate drag direction
- Grid updates in real-time as you drag

### Resetting to Defaults

If you want to restore the original proportions:

1. Click the QuadTV toolbar icon
2. Click **"Reset Grid Sizing"**
3. All streams return to equal sizes

**Note**: This resets ALL layouts to their defaults, not just the current one.

### Per-Layout Memory

**New in v0.4.0**: Each layout now remembers its own sizing preferences!

- **2x2** can have different sizing than **1+2** or **2-Vertical**
- When you switch layouts, your custom sizing for that layout is preserved
- Example: Make left stream larger in 2x2, then switch to 1+2 - when you return to 2x2, the left stream is still larger!

---

## Stream Swapping

**New in v0.4.0**: Easily reorder your streams with drag-and-drop!

### How to Swap Streams

1. **Hover over any stream** - A ⇄ swap button appears in the top-left corner
2. **Click and drag** the swap button (or anywhere on the stream container)
3. **Drag to another stream** - You'll see visual feedback:
   - Dragging stream has a red dashed border and fades to 50% opacity
   - Drop target has a green dashed border and highlights
4. **Drop** to swap the two streams' channels

### Visual Feedback

During swapping, you'll see:
- **Red dashed border** = Stream being dragged
- **Green dashed border** = Where the stream will swap to
- **Green flash** = Successful swap confirmation

### Use Cases

**Rearranging Your View**:
- Found the perfect game in stream 3? Swap it to stream 1 (larger position)
- Organizing channels by priority (most important in top-left)
- Quick comparison by putting related content side-by-side

**Mobile/Touch Support**:
- Swap button is always visible on mobile devices for easier tapping
- Drag works with both mouse and touch interfaces

### Tips

- You can drag from any part of the stream container, not just the swap button
- Swap works across all layouts (2x2, 1+2, 2-vertical)
- Swaps are instant - channels exchange positions immediately
- The swap only exchanges iframe sources, not your custom sizing

---

## Audio Control

### Important: Manual Audio Control

Due to browser security restrictions, QuadTV **cannot** automatically control audio within YouTube TV iframes. You must manually manage audio:

### How to Control Audio

**For Each Stream:**
1. Click inside the stream you want to hear
2. Use YouTube TV's native volume controls in that stream
3. Mute other streams manually if needed

**Quick Mute All:**
- Press `Alt+M` to mute all streams at once
- Then unmute only the stream you want to hear

### Why Manual Control?

YouTube TV runs inside iframes, which are cross-origin (different domains from QuadTV). Browser security prevents extensions from controlling audio/video in cross-origin iframes. This is a security feature, not a bug.

**Trade-off**: Manual control means QuadTV stays lightweight, secure, and reliable.

---

## Tips & Tricks

### 🏈 Sports Watching

**Game Day Setup**:
- Use **2x2** for monitoring 4 games simultaneously
- Resize the game you care most about to be larger
- Mute all, then unmute your primary game
- Quick-check scores by glancing at the grid

### 📰 News Monitoring

**Multi-Network Coverage**:
- Use **1+2** with main network in large stream
- Secondary networks in smaller streams for comparison
- Unmute primary, but watch for breaking news visually

### 🎬 Channel Surfing

**Browse Multiple Guides**:
- Open YouTube TV guide in each stream
- Navigate different categories simultaneously
- Find content faster by parallel browsing

### 💾 Layout Preferences

**Save Mental "Presets"**:
- Set up your favorite layout and sizing
- QuadTV remembers your divider positions
- Same setup every time you activate

**Example**: Sports Fan Preset
1. Activate 2x2 layout
2. Drag dividers to make top-left 60% larger
3. Next time you activate, sizes are remembered!

---

## Troubleshooting

### QuadTV Won't Activate

**Check:**
- ✅ Are you on [tv.youtube.com](https://tv.youtube.com)?
  - QuadTV only works on YouTube TV, not regular YouTube
- ✅ Is the page fully loaded?
  - Wait for YouTube TV to finish loading before activating
- ✅ Try refreshing the page

### Streams Not Loading

**Solutions:**
1. **Wait a moment** - Iframes take time to load YouTube TV
2. **Check your internet** - Multiple streams need bandwidth
3. **Refresh the page** - Press `Esc` to exit, then F5 to refresh
4. **Re-activate QuadTV** - Sometimes a second activation works

### Dividers Won't Drag

**Check:**
- ✅ Hover directly over the divider line
- ✅ Look for cursor change (↔ or ↕)
- ✅ Click and hold while dragging
- ✅ Try refreshing the page if issue persists

### Keyboard Shortcuts Not Working

**Check:**
- ✅ Is QuadTV active? (Shortcuts only work when grid is visible)
- ✅ Are you typing in a text field? (Shortcuts disabled during typing)
- ✅ Is your cursor inside the YouTube TV page? (Click the page first)

### Audio Issues

**Remember:**
- QuadTV cannot control audio automatically
- You must manually unmute the stream you want to hear
- Use `Alt+M` to mute all, then unmute your preferred stream

### Performance Issues

**If streams are laggy:**
- Close other browser tabs (each stream uses resources)
- Use a lower layout (2-Vertical uses less than 2x2)
- Check your internet speed (4 HD streams need ~25 Mbps)
- Ensure hardware acceleration is enabled in Firefox

---

## FAQ

### Do I need a YouTube TV subscription?

**Yes.** QuadTV is an enhancement for YouTube TV subscribers. Each stream requires YouTube TV authentication.

### Does QuadTV work on regular YouTube?

**No.** QuadTV is specifically designed for [tv.youtube.com](https://tv.youtube.com) only.

### Can I watch different shows in each stream?

**Yes!** Each stream is fully independent. Navigate each one to different content.

### Will this violate YouTube's Terms of Service?

**No.** QuadTV simply displays multiple YouTube TV sessions in one browser tab. Each stream is a normal, authenticated YouTube TV session.

### Does QuadTV collect my data?

**No.** QuadTV stores only:
- Your layout preference (e.g., "2x2")
- Your divider positions (grid ratios)

All data stays local on your device. No analytics, no tracking, no external servers.

### Can I use QuadTV on Chrome or Edge?

**Not yet.** Currently Firefox-only. Chrome/Edge support may come in future versions.

### Why can't QuadTV auto-switch audio between streams?

Browser security (CORS - Cross-Origin Resource Sharing) prevents extensions from controlling content inside iframes from different domains. This is a security feature protecting your data.

### How much bandwidth does QuadTV use?

**Estimate**: ~5-10 Mbps per HD stream
- 2 streams: ~10-20 Mbps
- 3 streams: ~15-30 Mbps
- 4 streams: ~20-40 Mbps

YouTube TV automatically adjusts quality based on your connection.

### Can I save channel presets?

**Not yet.** Layout presets are planned for a future version. Currently, you can save divider sizing, but not which channels are loaded.

### Does QuadTV work with DVR recordings?

**Yes!** Any content available in YouTube TV works, including:
- Live TV
- DVR recordings
- On-demand content
- YouTube TV's library

---

## Getting Help

### Found a Bug?

Report it on GitHub: [https://github.com/Jimbo1167/quadtv/issues](https://github.com/Jimbo1167/quadtv/issues)

**Include:**
- Firefox version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

### Feature Requests

We'd love to hear your ideas! Open an issue on GitHub with the `enhancement` label.

### Support

- Check [LIMITATIONS.md](LIMITATIONS.md) for known constraints
- Review [CHANGELOG.md](CHANGELOG.md) for recent changes
- Read [README.md](README.md) for technical details

---

## Quick Reference Card

Print or bookmark this for easy reference:

```
╔══════════════════════════════════════════════════╗
║            QuadTV Quick Reference                ║
╠══════════════════════════════════════════════════╣
║ Activate/Deactivate  │ Toolbar icon             ║
║ Exit QuadTV          │ Esc                      ║
║ Cycle Layouts        │ Ctrl+Space (Cmd+Space)   ║
║ Mute All             │ Alt+M                    ║
║ Show Help            │ ?                        ║
║ Resize Streams       │ Drag dividers            ║
║ Reset Sizing         │ Popup → "Reset Grid"     ║
╠══════════════════════════════════════════════════╣
║ Layouts: 2x2 (4) │ 1+2 (3) │ 2-Vertical (2)    ║
╚══════════════════════════════════════════════════╝
```

---

**Enjoy QuadTV!** 📺📺📺📺
