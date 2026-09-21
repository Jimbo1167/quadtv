/**
 * Tests the FrameAgent that runs inside each QuadTV tile.
 */
const { FrameAgent } = require('../../src/content/frameAgent.js');

const ORIGIN = 'https://tv.youtube.com';

function makeVideo({ muted = false, paused = false } = {}) {
  const v = { muted, paused };
  v.play = jest.fn(() => { v.paused = false; return Promise.resolve(); });
  return v;
}

function makeFrame({ name = 'quadtv-stream-2', isTop = false, videos = [] } = {}) {
  const listeners = {};
  const parent = { postMessage: jest.fn() };
  const win = {
    name,
    parent,
    location: { href: `${ORIGIN}/watch/abc` },
    addEventListener: jest.fn((type, fn) => { listeners[type] = fn; }),
    removeEventListener: jest.fn(),
    MutationObserver: class { observe() {} disconnect() {} }
  };
  win.top = isTop ? win : { other: true };
  const doc = {
    documentElement: {},
    querySelectorAll: jest.fn(() => videos),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  };
  const agent = new FrameAgent(win, doc);
  const dispatch = (data, origin = ORIGIN) => listeners.message({ origin, data, source: parent });
  return { agent, win, doc, parent, dispatch, videos };
}

describe('FrameAgent', () => {
  let started = [];
  afterEach(() => { started.forEach(a => a.stop()); started = []; });

  test('parses the stream index from the iframe name', () => {
    expect(FrameAgent.parseIndex('quadtv-stream-0')).toBe(0);
    expect(FrameAgent.parseIndex('quadtv-stream-3')).toBe(3);
    expect(FrameAgent.parseIndex('quadtv-stream-x')).toBeNull();
    expect(FrameAgent.parseIndex('')).toBeNull();
    expect(FrameAgent.parseIndex(undefined)).toBeNull();
  });

  test('does not start in the top frame or in an unnamed frame', () => {
    const top = makeFrame({ isTop: true });
    const unnamed = makeFrame({ name: '' });
    expect(top.agent.start()).toBe(false);
    expect(unnamed.agent.start()).toBe(false);
    expect(top.parent.postMessage).not.toHaveBeenCalled();
  });

  test('announces READY to the parent with its index and URL', () => {
    const f = makeFrame();
    expect(f.agent.start()).toBe(true);
    started.push(f.agent);

    expect(f.parent.postMessage).toHaveBeenCalledWith(
      { source: 'quadtv-frame', index: 2, type: 'READY', url: `${ORIGIN}/watch/abc` },
      ORIGIN
    );
  });

  test('mutes every video on SET_MUTED and reports state', () => {
    const videos = [makeVideo(), makeVideo()];
    const f = makeFrame({ videos });
    f.agent.start(); started.push(f.agent);

    f.dispatch({ source: 'quadtv', type: 'SET_MUTED', muted: true });

    expect(videos.every(v => v.muted)).toBe(true);
    expect(f.parent.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'STATE', index: 2, muted: true, hasVideo: true }),
      ORIGIN
    );
  });

  test('unmutes and nudges a paused video to play', () => {
    const videos = [makeVideo({ muted: true, paused: true })];
    const f = makeFrame({ videos });
    f.agent.start(); started.push(f.agent);

    f.dispatch({ source: 'quadtv', type: 'SET_MUTED', muted: false });

    expect(videos[0].muted).toBe(false);
    expect(videos[0].play).toHaveBeenCalled();
  });

  test('ignores messages from other origins or without the quadtv tag', () => {
    const videos = [makeVideo()];
    const f = makeFrame({ videos });
    f.agent.start(); started.push(f.agent);

    f.dispatch({ source: 'quadtv', type: 'SET_MUTED', muted: true }, 'https://evil.example');
    f.dispatch({ type: 'SET_MUTED', muted: true });

    expect(videos[0].muted).toBe(false);
  });

  test('re-applies the desired state to videos that appear later', () => {
    const videos = [];
    const f = makeFrame({ videos });
    f.agent.start(); started.push(f.agent);

    f.dispatch({ source: 'quadtv', type: 'SET_MUTED', muted: true });
    const late = makeVideo();
    videos.push(late);
    f.agent.applyMuteState();

    expect(late.muted).toBe(true);
  });

  test('leaves the player alone until instructed', () => {
    const videos = [makeVideo()];
    const f = makeFrame({ videos });
    f.agent.start(); started.push(f.agent);

    f.agent.applyMuteState();
    expect(videos[0].muted).toBe(false);
  });
});
