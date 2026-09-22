/**
 * Tests the real UIManager's handling of streams hidden by a layout change.
 *
 * Regression: switching from 2x2 to a smaller layout only set display:none on
 * the extra tiles, so their iframes kept playing audio. Hidden tiles are now
 * muted immediately, kept loaded for a grace period so switching back is
 * instant, then unloaded, and reloaded when the layout shows them again.
 */
const { MessageBus } = require('../../src/shared/messageBus.js');

global.window.QuadTVMessageBus = new MessageBus();
global.window.QuadTVLayoutEngine = {};
global.window.addEventListener = jest.fn();

const { UIManager } = require('../../src/content/uiManager.js');

const ORIGIN = 'https://tv.youtube.com';
const makeIframe = (src) => ({ src, dataset: {}, contentWindow: { postMessage: jest.fn() } });
const makeStream = () => ({ style: {}, classList: { add: jest.fn(), remove: jest.fn(), toggle: jest.fn() } });
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

describe('UIManager hidden stream handling (real implementation)', () => {
  let ui;
  let iframes;
  let streams;

  beforeEach(() => {
    jest.useFakeTimers();
    ui = new UIManager();
    ui.isActive = true;
    ui.currentLayout = '2x2';
    ui.gridContainer = { style: {}, setAttribute: jest.fn() };
    ui.updateDividers = jest.fn();
    ui.updateToolbar = jest.fn();

    iframes = [0, 1, 2, 3].map(() => makeIframe(ORIGIN));
    streams = [0, 1, 2, 3].map(makeStream);
    ui.iframes = iframes;

    document.querySelector = jest.fn(() => ui.gridContainer);
    document.querySelectorAll = jest.fn(() => streams);
  });

  afterEach(() => jest.useRealTimers());

  const lastMuteSent = (i) => iframes[i].contentWindow.postMessage.mock.calls.at(-1)?.[0];

  test('mutes hidden tiles immediately but keeps them loaded', () => {
    ui.updateGridLayout('2-vertical');

    expect(streams[2].style.display).toBe('none');
    expect(streams[3].style.display).toBe('none');
    expect(lastMuteSent(2)).toEqual({ source: 'quadtv', type: 'SET_MUTED', muted: true });
    expect(lastMuteSent(3)).toEqual({ source: 'quadtv', type: 'SET_MUTED', muted: true });
    expect(iframes[2].src).toBe(ORIGIN);
    expect(iframes[3].src).toBe(ORIGIN);
  });

  test('unloads a tile that stays hidden past the grace period', () => {
    ui.updateGridLayout('2-vertical');
    jest.advanceTimersByTime(UIManager.HIDDEN_UNLOAD_MS);

    expect(iframes[2].src).toBe('about:blank');
    expect(iframes[3].src).toBe('about:blank');
    expect(iframes[0].src).toBe(ORIGIN);
  });

  test('switching back within the grace period cancels the unload', () => {
    ui.updateGridLayout('2-vertical');
    jest.advanceTimersByTime(1000);
    ui.updateGridLayout('2x2');
    jest.advanceTimersByTime(UIManager.HIDDEN_UNLOAD_MS);

    iframes.forEach((iframe) => expect(iframe.src).toBe(ORIGIN));
    streams.forEach((stream) => expect(stream.style.display).toBe('block'));
  });

  test('reloads an unloaded tile when a larger layout shows it again, still muted', () => {
    ui.updateGridLayout('2-vertical');
    jest.advanceTimersByTime(UIManager.HIDDEN_UNLOAD_MS);
    ui.updateGridLayout('2x2');

    iframes.forEach((iframe) => {
      expect(iframe.src).toBe(ORIGIN);
      expect(iframe.dataset.unloaded).toBeUndefined();
    });
    expect(ui.desiredMuted[2]).toBe(true);
    expect(ui.desiredMuted[3]).toBe(true);
  });

  test('does not touch iframes that were already visible', () => {
    iframes[1].src = `${ORIGIN}/watch/abc`; // user changed channel
    ui.updateGridLayout('1+2');
    jest.advanceTimersByTime(UIManager.HIDDEN_UNLOAD_MS);

    expect(iframes[1].src).toBe(`${ORIGIN}/watch/abc`);
    expect(iframes[3].src).toBe('about:blank');
  });

  test('moves audio focus to stream 1 when the focused stream gets hidden', async () => {
    ui.activeAudioStream = 3;
    ui.updateGridLayout('2-vertical');
    await flush();

    expect(ui.activeAudioStream).toBe(0);
    expect(lastMuteSent(0)).toEqual({ source: 'quadtv', type: 'SET_MUTED', muted: false });
    expect(lastMuteSent(3)).toEqual({ source: 'quadtv', type: 'SET_MUTED', muted: true });
  });

  test('keeps audio focus when the focused stream stays visible', () => {
    ui.activeAudioStream = 1;
    ui.updateGridLayout('2-vertical');
    expect(ui.activeAudioStream).toBe(1);
  });

  test('is a no-op when the layout has not changed', () => {
    ui.updateGridLayout('2x2');
    jest.advanceTimersByTime(UIManager.HIDDEN_UNLOAD_MS);
    iframes.forEach((iframe) => expect(iframe.src).toBe(ORIGIN));
  });
});

describe('UIManager layout switching from in-page controls (real implementation)', () => {
  let ui;

  beforeEach(() => {
    ui = new UIManager();
    ui.isActive = true;
    ui.currentLayout = '2x2';
    ui.updateGridLayout = jest.fn();
    ui.peekToolbar = jest.fn();
  });

  test('L cycles layouts and publishes LAYOUT_CHANGED for persistence', () => {
    const published = [];
    window.QuadTVMessageBus.subscribe('LAYOUT_CHANGED', (d) => published.push(d.layout));

    ui.handleShortcut({ key: 'l', altKey: false, ctrlKey: false, metaKey: false });
    expect(ui.currentLayout).toBe('1+2');
    ui.handleShortcut({ key: 'L', altKey: true, ctrlKey: false, metaKey: false });
    expect(ui.currentLayout).toBe('2-vertical');
    ui.handleShortcut({ key: 'l', altKey: false, ctrlKey: false, metaKey: false });
    expect(ui.currentLayout).toBe('2x2');

    expect(published).toEqual(['1+2', '2-vertical', '2x2']);
  });

  test('Ctrl/Cmd+Space still cycles', () => {
    ui.handleShortcut({ key: ' ', altKey: false, ctrlKey: true, metaKey: false });
    expect(ui.currentLayout).toBe('1+2');
  });
});
