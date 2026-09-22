# QuadTV - AMO Listing Content

This document contains the official listing content for Firefox Add-ons (AMO).

---

## Extension Name
**QuadTV**

---

## Short Description (132 characters max)

Watch multiple YouTube TV channels at once with customizable layouts, resizable streams and one-key audio focus.

**Character count:** 112/132 ✓

---

## Full Description

Transform your YouTube TV experience with QuadTV - the ultimate multi-stream viewing extension for sports fans and news junkies.

### What is QuadTV?

QuadTV lets you watch up to 4 YouTube TV channels simultaneously in a single browser tab. Perfect for:
- 📺 Watching multiple sports games at once
- 📰 Monitoring different news channels
- 🎬 Keeping up with multiple live events
- 🏈 Never missing a moment of game day action

### Key Features

**✨ Multiple Layout Options**
- **2x2 Grid**: Watch 4 channels in equal-sized windows
- **1+2 Layout**: One large stream with 2 smaller streams on the side
- **2-Vertical**: Two side-by-side streams for dual viewing

**📐 Fully Customizable Stream Sizing**
- Drag dividers to resize any stream
- Create your perfect viewing layout
- Settings persist across sessions
- Reset to defaults with one click

**🔊 Audio Focus**
- One stream has sound, the rest stay muted - no hunting for volume buttons
- Click a stream's number badge, press 1-4, or use the arrow keys to move audio
- Alt+M mutes everything
- Ad breaks can't sneak a muted stream back on

**🎯 Simple Controls**
- Click toolbar icon to activate/deactivate
- Switch layouts from the bar at the top of the grid, the popup, or by pressing L
- Switching back to a bigger layout is instant; hidden streams come back on the same channel
- Visual indicators show active state
- One-click grid reset

**🔒 Privacy-First Design**
- No data collection or tracking
- All settings stored locally only
- No external servers or analytics
- Open source and auditable

### How It Works

1. Navigate to tv.youtube.com
2. Click the QuadTV icon in your toolbar
3. Select your preferred layout (2x2, 1+2, or 2-vertical)
4. Each stream loads in its own iframe - navigate to different channels independently
5. Stream 1 has sound; click another stream's number badge (or press 1-4 / arrows) to move it
6. Drag dividers to resize streams to your preference
7. Click Reset Grid Sizing to return to defaults

### Perfect For

- **Sports Enthusiasts**: Watch multiple games simultaneously without missing key plays
- **News Watchers**: Monitor different news sources side-by-side
- **Live Event Followers**: Keep up with multiple streams during breaking events
- **YouTube TV Power Users**: Maximize your subscription value

### Technical Details

- Works exclusively with YouTube TV (tv.youtube.com)
- Requires active YouTube TV subscription
- Lightweight and fast (24KB package)
- No performance impact on your browser
- Compatible with all YouTube TV features

### What's Included

✅ Three distinct layout options
✅ Resizable stream dividers with drag-and-drop
✅ Persistent settings and preferences
✅ One-action audio focus (badge, 1-4, arrow keys)
✅ Grid reset functionality
✅ Visual status indicators
✅ Clean, intuitive interface

### Limitations

- Only works on tv.youtube.com (YouTube TV subscription required)
- Each stream operates independently (no synchronized playback)
- YouTube TV's own speaker icon may not reflect QuadTV's mute; the stream badge is the source of truth
- After clicking inside a stream, hold Alt/Option with the shortcut keys

### Privacy & Permissions

QuadTV requests minimal permissions:
- **activeTab**: Inject the multi-view grid into YouTube TV
- **tabs**: Verify you're on YouTube TV before activating
- **storage**: Save your layout preferences locally
- **tv.youtube.com**: Restrict extension to YouTube TV only

See our complete [Privacy Policy](link) and [Permissions Justification](link) for full transparency.

### Support & Feedback

- Report issues: [GitHub Issues](your-repo-url)
- Feature requests welcome
- Open source contributions encouraged

---

**Disclaimer**: QuadTV is not affiliated with, endorsed by, or sponsored by Google LLC or YouTube. YouTube and YouTube TV are trademarks of Google LLC.

---

## Categories

**Primary:** Video & Audio
**Secondary:** Entertainment

---

## Tags (comma-separated)

youtube, tv, streaming, multi-view, quad, split-screen, sports, news, live-tv, picture-in-picture

---

## Support Email/URL

**GitHub Issues**: https://github.com/[your-username]/quadtv/issues

---

## Homepage/Source Code

**Repository**: https://github.com/[your-username]/quadtv

---

## Version Notes (paste into AMO's "Release notes" field as-is; it is plain text)

```
QuadTV 1.0.0

Audio focus is here. One stream has sound and the rest stay muted, so four games no longer talk over each other. Click a stream's number badge, press 1-4, or use the arrow keys to move the sound. Alt+M mutes everything. If you've clicked inside a stream, hold Alt (Option on Mac) with the same keys.

New
- Audio focus: badge click, 1-4, arrow keys, Alt+M
- Layout bar at the top edge of the grid: switch layouts, see which stream has sound, open help, or exit without the popup
- Press L to cycle layouts (Ctrl/Cmd+Space still works)
- Switching back to a bigger layout is instant, and hidden streams return on the channel they were on

Fixed
- Changing layout from the popup while QuadTV was active did nothing
- The 1+2 layout's large stream now fills the left column
- Streams hidden by a smaller layout no longer keep playing audio
- Custom divider positions now apply when switching layouts
- Alt+M works on macOS

Good to know
- YouTube TV's own speaker icon may not match QuadTV's mute. Trust the stream badge and red glow.
- Ad breaks can cause a brief blip of sound before a muted stream goes quiet again.
- QuadTV collects no data. All settings stay in your browser.

Requires a YouTube TV subscription. Firefox only.
```

### Short version (if the field is tight)

```
Audio focus: one stream has sound, move it with a badge click, 1-4, or the arrow keys. New layout bar at the top of the grid; L cycles layouts. Fixed layout switching from the popup, the 1+2 layout, and hidden streams that kept playing audio. No data collected.
```

---

## Screenshot Captions (for when you take screenshots)

1. **Screenshot 1 - Inactive State**
   Caption: "QuadTV before activation - normal YouTube TV interface"

2. **Screenshot 2 - 2x2 Layout Active**
   Caption: "Watch 4 channels simultaneously in a 2x2 grid layout"

3. **Screenshot 3 - Popup Interface**
   Caption: "Simple popup menu for layout selection and controls"

4. **Screenshot 4 - Resizable Dividers**
   Caption: "Drag dividers to customize stream sizes to your preference"

5. **Screenshot 5 - 1+2 Layout**
   Caption: "1+2 layout: One large stream with two smaller streams on the side"

6. **Screenshot 6 - 2-Vertical Layout**
   Caption: "2-vertical layout: Perfect for dual-screen viewing"

---

## Promotional Copy (for social media, etc.)

**Twitter/X (280 characters):**
🎉 Introducing QuadTV for Firefox! Watch multiple YouTube TV channels simultaneously with customizable layouts. Perfect for sports fans and news junkies. 📺⚡

Try it free: [AMO link]

**LinkedIn/Facebook:**
Excited to announce QuadTV - a Firefox extension that transforms how you watch YouTube TV!

Never miss a moment with multi-stream viewing:
✅ Watch up to 4 channels at once
✅ Customizable layouts (2x2, 1+2, 2-vertical)
✅ Resizable streams with drag-and-drop
✅ 100% privacy-focused (no tracking)

Perfect for sports fans, news watchers, and YouTube TV power users.

Download free on Firefox Add-ons: [link]

---

## FAQ (for support/documentation)

**Q: Do I need a YouTube TV subscription?**
A: Yes, QuadTV only works with YouTube TV (tv.youtube.com) which requires a subscription.

**Q: Can I watch more than 4 streams?**
A: Currently, QuadTV supports up to 4 simultaneous streams in the 2x2 layout.

**Q: Does it work on regular YouTube?**
A: No, QuadTV is specifically designed for YouTube TV (tv.youtube.com).

**Q: Is my data collected?**
A: No. QuadTV does not collect any data. All settings are stored locally in your browser.

**Q: Can I resize the streams?**
A: Yes! Drag the dividers between streams to create your custom layout.

**Q: How do I reset my custom sizing?**
A: Click the "Reset Grid Sizing" button in the popup menu.

**Q: Does it work on Chrome/Edge/Safari?**
A: Currently QuadTV is only available for Firefox. Other browsers may be supported in the future.

**Q: How does audio work with four streams?**
A: One stream has sound and the rest are muted. Click a stream's number badge, press 1-4, or use the arrow keys to move the sound. Alt+M mutes everything. If you have clicked inside a stream, hold Alt (Option on Mac) with the same keys.

**Q: Is it open source?**
A: Yes! View the source code at [GitHub URL]

**Q: I found a bug, how do I report it?**
A: Please open an issue at [GitHub Issues URL]
