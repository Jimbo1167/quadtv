# Frame agent spike (branch `spike/frame-agent`)

## Premise

`LIMITATIONS.md` says audio can't be controlled because the tiles are
cross-origin. They aren't: the page and every tile are `https://tv.youtube.com`.
The main content script only runs in the top frame because the manifest never
set `all_frames`, and the old attempt depended on YouTube's volume-button
selector. This spike injects a second, tiny content script into every frame
instead and lets it own the tile's `<video>` directly.

## Pieces

- `src/content/frameAgent.js` — runs in all frames, activates only when
  `window.name` is `quadtv-stream-N`. Handles `SET_MUTED` / `GET_STATE` from the
  parent, re-applies the mute state whenever YouTube swaps the video element,
  and reports `READY`, `STATE` and `URL` up to the parent.
- `src/content/uiManager.js` — names each iframe, listens for agent messages,
  re-sends the desired mute state on `READY`, and restores hidden tiles to the
  channel their agent last reported instead of the home page.
- Stream 1 starts with audio and the rest start muted. Click a tile's number
  badge, press 1–4, or use the arrow keys to move audio focus. Alt+M still
  mutes everything.
- Keys pressed inside a tile never reach the top frame, so the agent forwards
  Alt-modified shortcuts (Alt+arrows, Alt+1–4, Alt+M) as `KEY` messages. Plain
  keys are left to YouTube TV so its own navigation keeps working.

## What to verify

1. Activate in 2x2. Only tile 1 should have sound. Console shows
   `FrameAgent: active in tile N` four times and `Tile N agent ready`.
2. Click tile 3's number badge. Audio moves to tile 3, red glow follows.
3. Change the channel inside tile 3. Sound should stay on (agent re-applies on
   the new video element).
4. Switch to 2 Vertical and back to 2x2. Tiles 3 and 4 should come back on the
   channel they were on, not the home page, and stay muted.
5. Press 1 through 4 or the arrow keys with the page (not a tile) focused.
6. Click inside a tile, then press Alt+Right / Alt+Down. Focus should still
   move. Plain arrows inside the tile should still drive YouTube TV.

## Ad breaks

YouTube TV's ad player flips the video element back to unmuted at ad
boundaries (the `pagead/interaction` beacons in the console with `mut=0` are
its viewability reports, and they're harmless CORS noise). The agent listens
for `volumechange` in the capture phase and reverts the change synchronously,
and a once-a-second tick re-asserts the state as a safety net. YouTube TV's
own mute icon may still show unmuted; the tile badge is the source of truth.

## Known risks

- Firefox's autoplay policy may pause a video that is unmuted without a user
  gesture inside that frame. The agent calls `play()` after unmuting as a
  nudge. If unmuting silently fails, this is the first thing to look at.
- YouTube TV's own mute icon won't reflect a mute set on the element. The tile
  badge is the source of truth.
- Unmodified keys only work when the top frame has focus. Inside a tile, hold
  Alt (Option on macOS). Modifier-plus-key inside the tile may collide with a
  YouTube TV shortcut; none are known yet.
