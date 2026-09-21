/**
 * Tests the real UIManager's messaging with the per-tile frame agents.
 */
const { MessageBus } = require('../../src/shared/messageBus.js');

global.window.QuadTVMessageBus = new MessageBus();
global.window.QuadTVLayoutEngine = {};
global.window.addEventListener = jest.fn();

const { UIManager } = require('../../src/content/uiManager.js');

const ORIGIN = 'https://tv.youtube.com';

describe('UIManager frame messaging (real implementation)', () => {
  let ui;
  let iframes;

  beforeEach(() => {
    ui = new UIManager();
    ui.isActive = true;
    ui.currentLayout = '2x2';
    iframes = [0, 1, 2, 3].map(() => ({ src: ORIGIN, dataset: {}, contentWindow: { postMessage: jest.fn() } }));
    ui.iframes = iframes;
    document.querySelectorAll = jest.fn(() => []);
  });

  const frameMessage = (index, data) =>
    ui.onFrameMessage({ origin: ORIGIN, source: iframes[index].contentWindow, data: { source: 'quadtv-frame', index, ...data } });

  test('setStreamMuted posts SET_MUTED to the tile with the YouTube TV origin', () => {
    expect(ui.setStreamMuted(1, true)).toBe(true);
    expect(iframes[1].contentWindow.postMessage).toHaveBeenCalledWith(
      { source: 'quadtv', type: 'SET_MUTED', muted: true }, ORIGIN
    );
    expect(ui.desiredMuted[1]).toBe(true);
  });

  test('setAudioFocus unmutes the target and mutes every other visible stream', async () => {
    await ui.setAudioFocus(2);

    const sent = iframes.map(f => f.contentWindow.postMessage.mock.calls.at(-1)[0].muted);
    expect(sent).toEqual([true, true, false, true]);
    expect(ui.activeAudioStream).toBe(2);
  });

  test('re-sends the desired mute state when a tile reports READY', () => {
    ui.setStreamMuted(3, true);
    iframes[3].contentWindow.postMessage.mockClear();

    frameMessage(3, { type: 'READY', url: `${ORIGIN}/watch/xyz` });

    expect(iframes[3].contentWindow.postMessage).toHaveBeenCalledWith(
      { source: 'quadtv', type: 'SET_MUTED', muted: true }, ORIGIN
    );
    expect(ui.frameStates[3]).toEqual(expect.objectContaining({ ready: true, url: `${ORIGIN}/watch/xyz` }));
  });

  test('ignores frame messages from other origins or unexpected windows', () => {
    ui.onFrameMessage({ origin: 'https://evil.example', source: iframes[0].contentWindow, data: { source: 'quadtv-frame', index: 0, type: 'READY', url: 'x' } });
    ui.onFrameMessage({ origin: ORIGIN, source: {}, data: { source: 'quadtv-frame', index: 0, type: 'READY', url: 'x' } });

    expect(ui.frameStates[0]).toBeUndefined();
  });

  test('restores a hidden tile to the channel its agent last reported', () => {
    frameMessage(2, { type: 'URL', url: `${ORIGIN}/watch/espn` });
    ui.unloadStream(2);
    expect(iframes[2].src).toBe('about:blank');

    ui.restoreStream(2);
    expect(iframes[2].src).toBe(`${ORIGIN}/watch/espn`);
  });

  test('falls back to the home page when no URL is known or it is off-origin', () => {
    ui.unloadStream(1);
    ui.restoreStream(1);
    expect(iframes[1].src).toBe(ORIGIN);

    frameMessage(3, { type: 'URL', url: 'https://accounts.google.com/x' });
    ui.unloadStream(3);
    ui.restoreStream(3);
    expect(iframes[3].src).toBe(ORIGIN);
  });
});
