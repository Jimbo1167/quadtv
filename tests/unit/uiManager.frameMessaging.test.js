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

describe('UIManager audio focus keyboard navigation (real implementation)', () => {
  let ui;
  let iframes;

  beforeEach(() => {
    ui = new UIManager();
    ui.isActive = true;
    ui.currentLayout = '2x2';
    iframes = [0, 1, 2, 3].map(() => ({ src: ORIGIN, dataset: {}, contentWindow: { postMessage: jest.fn() } }));
    ui.iframes = iframes;
    document.querySelectorAll = jest.fn(() => []);
    ui.setAudioFocus = jest.fn(async (i) => { ui.activeAudioStream = i; });
  });

  test('arrows move focus spatially in 2x2', () => {
    ui.activeAudioStream = 0;
    expect(ui.moveAudioFocus('right')).toBe(1);
    expect(ui.moveAudioFocus('down')).toBe(3);
    expect(ui.moveAudioFocus('left')).toBe(2);
    expect(ui.moveAudioFocus('up')).toBe(0);
  });

  test('1+2 layout: big tile goes right to the top small tile, small tiles go left to the big one', () => {
    ui.currentLayout = '1+2';
    ui.activeAudioStream = 0;
    expect(ui.moveAudioFocus('up')).toBeNull();
    expect(ui.moveAudioFocus('right')).toBe(1);
    expect(ui.moveAudioFocus('down')).toBe(2);
    expect(ui.moveAudioFocus('left')).toBe(0);
  });

  test('2-vertical: left and right both toggle, up and down do nothing', () => {
    ui.currentLayout = '2-vertical';
    ui.activeAudioStream = 1;
    expect(ui.moveAudioFocus('up')).toBeNull();
    expect(ui.moveAudioFocus('left')).toBe(0);
    expect(ui.moveAudioFocus('left')).toBe(1);
  });

  test('starts at stream 1 when nothing has focus', () => {
    ui.activeAudioStream = null;
    expect(ui.moveAudioFocus('down')).toBe(0);
  });

  test('plain arrow keys in the top frame move focus and are consumed', () => {
    ui.activeAudioStream = 0;
    const event = { key: 'ArrowRight', code: 'ArrowRight', target: { tagName: 'DIV' }, preventDefault: jest.fn() };
    ui.handleKeyboardShortcut(event);
    expect(ui.setAudioFocus).toHaveBeenCalledWith(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test('Alt-modified digits and M are normalized from event.code (macOS Option)', () => {
    expect(UIManager.normalizeKey({ key: '¡', code: 'Digit1', altKey: true }).key).toBe('1');
    expect(UIManager.normalizeKey({ key: 'µ', code: 'KeyM', altKey: true }).key).toBe('m');
    expect(UIManager.normalizeKey({ key: '2', code: 'Digit2' }).key).toBe('2');
  });

  test('KEY messages forwarded from a tile run the same shortcuts', () => {
    ui.activeAudioStream = 1;
    ui.onFrameMessage({
      origin: ORIGIN, source: iframes[1].contentWindow,
      data: { source: 'quadtv-frame', index: 1, type: 'KEY', key: 'ArrowDown', code: 'ArrowDown', altKey: true }
    });
    expect(ui.setAudioFocus).toHaveBeenCalledWith(3);

    ui.onFrameMessage({
      origin: ORIGIN, source: iframes[1].contentWindow,
      data: { source: 'quadtv-frame', index: 1, type: 'KEY', key: '¡', code: 'Digit1', altKey: true }
    });
    expect(ui.setAudioFocus).toHaveBeenCalledWith(0);
  });

  test('shortcuts are ignored while inactive', () => {
    ui.isActive = false;
    expect(ui.handleShortcut({ key: 'ArrowRight', altKey: false, ctrlKey: false, metaKey: false })).toBe(false);
    expect(ui.setAudioFocus).not.toHaveBeenCalled();
  });
});
