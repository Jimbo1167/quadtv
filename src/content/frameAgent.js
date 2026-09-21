/**
 * FrameAgent - runs inside every tv.youtube.com frame (manifest: all_frames).
 *
 * It only activates inside a QuadTV tile, identified by the iframe name the
 * grid assigns ("quadtv-stream-N"). Inside a tile it owns the <video>
 * element directly, so the top frame can mute/unmute it without touching
 * YouTube TV's UI, and it reports the tile's current URL so a hidden tile can
 * be restored to the same channel later.
 *
 * Top frame and tiles share the tv.youtube.com origin, so window.postMessage
 * with an explicit targetOrigin is enough. Everything is behind the origin
 * check plus a `source` tag on the payload.
 *
 * Protocol (parent -> tile):  { source: 'quadtv', type: 'SET_MUTED', muted }
 *                             { source: 'quadtv', type: 'GET_STATE' }
 * Protocol (tile -> parent):  { source: 'quadtv-frame', index, type: 'READY'|'STATE'|'URL', ... }
 *
 * @class
 */
class FrameAgent {
  static NAME_PREFIX = 'quadtv-stream-';
  static ORIGIN = 'https://tv.youtube.com';

  /**
   * @param {Window} win - the frame's window
   * @param {Document} doc - the frame's document
   */
  constructor(win, doc) {
    this.win = win;
    this.doc = doc;
    this.index = FrameAgent.parseIndex(win.name);
    this.desiredMuted = null; // null = never instructed, leave the player alone
    this.lastUrl = null;
    this.observer = null;
    this.urlTimer = null;
    this.applyScheduled = false;
  }

  /**
   * Extract the stream index from an iframe name like "quadtv-stream-2"
   * @param {string} name
   * @returns {number|null}
   */
  static parseIndex(name) {
    if (typeof name !== 'string' || !name.startsWith(FrameAgent.NAME_PREFIX)) return null;
    const n = Number(name.slice(FrameAgent.NAME_PREFIX.length));
    return Number.isInteger(n) && n >= 0 ? n : null;
  }

  /** @returns {boolean} true when this frame is a QuadTV tile */
  isQuadTVTile() {
    return this.win !== this.win.top && this.index !== null;
  }

  /**
   * Start listening for parent messages and watching the player.
   * @returns {boolean} whether the agent activated
   */
  start() {
    if (!this.isQuadTVTile()) return false;

    this.onMessage = (event) => this.handleMessage(event);
    this.onPlay = () => this.scheduleApply();
    this.win.addEventListener('message', this.onMessage);
    // YouTube TV swaps <video> elements on channel change; re-apply on play
    this.doc.addEventListener('play', this.onPlay, true);

    if (typeof this.win.MutationObserver === 'function') {
      this.observer = new this.win.MutationObserver(() => this.scheduleApply());
      this.observer.observe(this.doc.documentElement, { childList: true, subtree: true });
    }

    this.urlTimer = setInterval(() => this.reportUrlIfChanged(), 1000);

    this.lastUrl = this.win.location.href;
    this.post('READY', { url: this.lastUrl });
    console.log(`🎛️ FrameAgent: active in tile ${this.index}`);
    return true;
  }

  /** Tear down listeners (used by tests) */
  stop() {
    if (this.onMessage) this.win.removeEventListener('message', this.onMessage);
    if (this.onPlay) this.doc.removeEventListener('play', this.onPlay, true);
    if (this.observer) this.observer.disconnect();
    if (this.urlTimer) clearInterval(this.urlTimer);
  }

  handleMessage(event) {
    if (event.origin !== FrameAgent.ORIGIN) return;
    const data = event.data;
    if (!data || data.source !== 'quadtv') return;

    switch (data.type) {
      case 'SET_MUTED':
        this.desiredMuted = Boolean(data.muted);
        this.applyMuteState();
        this.reportState();
        break;
      case 'GET_STATE':
        this.reportState();
        break;
      default:
        break;
    }
  }

  /** @returns {HTMLVideoElement[]} */
  videos() {
    return Array.from(this.doc.querySelectorAll('video'));
  }

  /** Coalesce bursts of DOM mutations into one apply */
  scheduleApply() {
    if (this.applyScheduled || this.desiredMuted === null) return;
    this.applyScheduled = true;
    setTimeout(() => {
      this.applyScheduled = false;
      this.applyMuteState();
    }, 0);
  }

  /** Push the desired mute state onto every video element in the tile */
  applyMuteState() {
    if (this.desiredMuted === null) return;

    for (const video of this.videos()) {
      if (video.muted !== this.desiredMuted) {
        video.muted = this.desiredMuted;
      }
      // Firefox may pause a stream that gets unmuted without a gesture; nudge it
      if (!this.desiredMuted && video.paused && typeof video.play === 'function') {
        try {
          const p = video.play();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch (_) { /* ignore */ }
      }
    }
  }

  reportState() {
    const vids = this.videos();
    this.post('STATE', {
      url: this.win.location.href,
      hasVideo: vids.length > 0,
      muted: vids.length ? vids.every(v => v.muted) : null,
      paused: vids.length ? vids.every(v => v.paused) : null
    });
  }

  reportUrlIfChanged() {
    const url = this.win.location.href;
    if (url !== this.lastUrl) {
      this.lastUrl = url;
      this.post('URL', { url });
    }
  }

  post(type, payload = {}) {
    this.win.parent.postMessage(
      { source: 'quadtv-frame', index: this.index, type, ...payload },
      FrameAgent.ORIGIN
    );
  }
}

// Auto-start in the browser; tests construct the class themselves
if (typeof module === 'undefined' || !module.exports) {
  new FrameAgent(window, document).start();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FrameAgent };
}
