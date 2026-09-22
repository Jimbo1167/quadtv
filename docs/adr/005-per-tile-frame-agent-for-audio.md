# ADR-005: Per-Tile Frame Agent for Audio Focus

## Status
**ACCEPTED** - September 22, 2026

Partially supersedes ADR-004's conclusion that automatic audio switching is blocked by browser security. ADR-004's choice of the iframe visual grid stands.

## Context

ADR-004 committed to the iframe grid and accepted manual audio control, on the understanding that the tiles were cross-origin and could not be scripted. v0.2.1 removed an earlier audio attempt (`IframeBridge`/`MessageProtocol`) that reached into `iframe.contentWindow.document` and clicked YouTube TV's volume button; it was unreliable.

Two facts were wrong in that analysis:

1. The tiles are **same-origin**. The page and every tile are `https://tv.youtube.com`.
2. The main content script only ran in the **top frame**, because the manifest never declared `all_frames`. Nothing was ever injected into the tiles.

Users with four live streams need one thing from audio: one stream audible, the rest silent, and a one-action way to move it. Without that, the grid is close to unusable for sports.

## Decision

Inject a second, minimal content script (`content/frameAgent.js`) with `all_frames: true`. It activates only inside frames whose `window.name` carries the `quadtv-stream-` prefix that the grid assigns to each tile iframe. Inside a tile it:

- sets `muted` on every `<video>` element to the state the top frame requested, and re-asserts it on `play`/`playing`/`loadstart`, on DOM mutation, synchronously on `volumechange` (YouTube TV's ad player unmutes at ad boundaries), and once a second as a safety net;
- reports `READY`, `STATE` and its current `URL` to the top frame, which uses the URL to restore a hidden tile to the channel it was on;
- forwards Alt-modified shortcut keys (`KEY`) because keystrokes inside a tile never reach the parent.

Top frame and tiles communicate over `window.postMessage` with an explicit `targetOrigin` of `https://tv.youtube.com`. Both sides check `event.origin` and a `source` tag; the top frame additionally checks `event.source` against the tile's `contentWindow`.

The top frame owns the model: `activeAudioStream`, `desiredMuted[index]` (re-sent when a tile's agent reports `READY`), and `frameStates[index]`. Stream 1 starts audible; badge click, keys `1`–`4`, arrow keys and `Alt+M` change it.

## Consequences

**Positive**
- Audio focus works with no new permissions; `tv.youtube.com` was already the only permitted host.
- The agent depends on nothing in YouTube TV's DOM except `<video>` elements, so it is far less brittle than the volume-button approach.
- Hidden tiles can be restored to their channel instead of the home page.
- Layout, audio and keyboard behaviour are testable against the real classes (146 tests).

**Negative / accepted**
- YouTube TV's own speaker icon can disagree with reality on a muted tile. The badge is the source of truth.
- Ad boundaries can produce a brief audible blip before the agent reverts the unmute.
- Unmodified keys inside a tile belong to YouTube TV; users must hold Alt or click a badge first.
- Firefox's autoplay policy could pause a stream unmuted without a gesture in that frame. The agent calls `play()` as a nudge; not yet observed in practice.
- Two content-script declarations and an `all_frames` script are more for AMO reviewers to read. `REVIEWER-NOTES.md` and `PERMISSIONS.md` explain it.

## Alternatives considered

- **Keep manual audio** (ADR-004). Rejected: the core use case suffers and the premise was wrong.
- **Route via background with `tabs.sendMessage(frameId)`**. Works, but needs `webNavigation` to enumerate frames. `postMessage` between same-origin frames is enough and adds no permission.
- **Keep hidden tiles loaded but muted**. Rejected: still streams video in the background. Unload and restore by reported URL instead.
- **Hover-to-listen**. Deferred; fits on top of this mechanism if wanted.
