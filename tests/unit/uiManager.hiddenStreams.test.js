/**
 * Tests the real UIManager's handling of streams hidden by a layout change.
 *
 * Regression: switching from 2x2 to a smaller layout only set display:none on
 * the extra tiles, so their iframes kept playing audio. Hidden tiles must be
 * unloaded, and reloaded when the layout shows them again.
 */
const { MessageBus } = require('../../src/shared/messageBus.js');

global.window.QuadTVMessageBus = new MessageBus();
global.window.QuadTVLayoutEngine = {};

const { UIManager } = require('../../src/content/uiManager.js');

const makeIframe = (src) => ({ src, dataset: {} });
const makeStream = () => ({ style: {} });

describe('UIManager hidden stream unloading (real implementation)', () => {
  let ui;
  let iframes;
  let streams;

  beforeEach(() => {
    ui = new UIManager();
    ui.isActive = true;
    ui.currentLayout = '2x2';
    ui.gridContainer = { style: {}, setAttribute: jest.fn() };
    ui.updateDividers = jest.fn();

    iframes = [0, 1, 2, 3].map(() => makeIframe('https://tv.youtube.com'));
    streams = [0, 1, 2, 3].map(makeStream);
    ui.iframes = iframes;

    document.querySelector = jest.fn(() => ui.gridContainer);
    document.querySelectorAll = jest.fn(() => streams);
  });

  test('unloads the tiles that a smaller layout hides', () => {
    ui.updateGridLayout('2-vertical');

    expect(iframes[0].src).toBe('https://tv.youtube.com');
    expect(iframes[1].src).toBe('https://tv.youtube.com');
    expect(iframes[2].src).toBe('about:blank');
    expect(iframes[3].src).toBe('about:blank');
    expect(streams[2].style.display).toBe('none');
    expect(streams[3].style.display).toBe('none');
  });

  test('reloads unloaded tiles when a larger layout shows them again', () => {
    ui.updateGridLayout('2-vertical');
    ui.updateGridLayout('2x2');

    iframes.forEach((iframe) => {
      expect(iframe.src).toBe('https://tv.youtube.com');
      expect(iframe.dataset.unloaded).toBeUndefined();
    });
    streams.forEach((stream) => expect(stream.style.display).toBe('block'));
  });

  test('does not touch iframes that were already visible', () => {
    iframes[1].src = 'https://tv.youtube.com/watch/abc'; // user changed channel
    ui.updateGridLayout('1+2');

    expect(iframes[1].src).toBe('https://tv.youtube.com/watch/abc');
    expect(iframes[3].src).toBe('about:blank');
  });

  test('is a no-op when the layout has not changed', () => {
    ui.updateGridLayout('2x2');
    iframes.forEach((iframe) => expect(iframe.src).toBe('https://tv.youtube.com'));
  });
});
