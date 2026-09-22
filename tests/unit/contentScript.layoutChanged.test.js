/**
 * Tests that in-page layout changes are persisted and relayed to the background.
 */
const { MessageBus } = require('../../src/shared/messageBus.js');

describe('ContentScript LAYOUT_CHANGED (real implementation)', () => {
  let bus;
  let settings;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    bus = new MessageBus();
    settings = { lastLayout: '2x2' };
    global.window.QuadTVMessageBus = bus;
    global.window.QuadTVStorageManager = {
      getSettings: jest.fn(async () => settings),
      saveSettings: jest.fn(async (s) => { settings = s; return true; })
    };
    browser.runtime.sendMessage.mockResolvedValue({ success: true });
    require('../../src/content/contentScript.js');
  });

  test('saves the new layout and notifies the background', async () => {
    bus.publish('LAYOUT_CHANGED', { layout: '2-vertical' });
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    expect(window.QuadTVStorageManager.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ lastLayout: '2-vertical' }));
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({ type: 'LAYOUT_CHANGED', layout: '2-vertical' });
  });

  test('ignores a change without a layout', async () => {
    bus.publish('LAYOUT_CHANGED', {});
    await new Promise(process.nextTick);
    expect(window.QuadTVStorageManager.saveSettings).not.toHaveBeenCalled();
  });
});
