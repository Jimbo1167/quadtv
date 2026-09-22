/**
 * Tests the real BackgroundController's SET_LAYOUT handling.
 *
 * Regression: layout changes sent from the popup have no sender.tab, so the
 * background must resolve the active tab itself before forwarding SET_LAYOUT
 * to the content script.
 */
const { BackgroundController } = require('../../src/background/backgroundController.js');

describe('BackgroundController SET_LAYOUT (real implementation)', () => {
  let controller;
  let sendResponse;
  const activeTab = { id: 42, url: 'https://tv.youtube.com/' };

  beforeEach(() => {
    jest.clearAllMocks();
    browser.tabs.query.mockResolvedValue([activeTab]);
    browser.tabs.sendMessage.mockResolvedValue({ success: true });
    controller = new BackgroundController();
    sendResponse = jest.fn();
  });

  test('forwards SET_LAYOUT from the popup (no sender.tab) to the active tab', async () => {
    const popupSender = { id: 'quadtv@extension' }; // popup messages carry no tab

    await controller.handleMessage({ type: 'SET_LAYOUT', layout: '1+2' }, popupSender, sendResponse);

    expect(browser.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(activeTab.id, {
      type: 'SET_LAYOUT',
      layout: '1+2'
    });
    expect(controller.currentLayout).toBe('1+2');
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  test('uses sender.tab directly when the message comes from a tab', async () => {
    const tabSender = { tab: { id: 7, url: 'https://tv.youtube.com/' } };

    await controller.handleMessage({ type: 'SET_LAYOUT', layout: '2-vertical' }, tabSender, sendResponse);

    expect(browser.tabs.query).not.toHaveBeenCalled();
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(7, {
      type: 'SET_LAYOUT',
      layout: '2-vertical'
    });
  });

  test('does not throw when no active tab can be found', async () => {
    browser.tabs.query.mockResolvedValue([]);

    await expect(
      controller.handleMessage({ type: 'SET_LAYOUT', layout: '2x2' }, {}, sendResponse)
    ).resolves.toBeUndefined();

    expect(browser.tabs.sendMessage).not.toHaveBeenCalled();
    expect(controller.currentLayout).toBe('2x2');
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  test('switching back and forth from the popup works in every direction', async () => {
    for (const layout of ['1+2', '2-vertical', '2x2', '2-vertical', '1+2']) {
      await controller.handleMessage({ type: 'SET_LAYOUT', layout }, {}, sendResponse);
      expect(browser.tabs.sendMessage).toHaveBeenLastCalledWith(activeTab.id, { type: 'SET_LAYOUT', layout });
    }
  });

  test('LAYOUT_CHANGED from the page updates the background copy used by GET_STATE', async () => {
    await controller.handleMessage({ type: 'LAYOUT_CHANGED', layout: '2-vertical' }, { tab: activeTab }, sendResponse);
    expect(controller.currentLayout).toBe('2-vertical');
    expect(sendResponse).toHaveBeenCalledWith({ success: true });

    const state = jest.fn();
    await controller.handleMessage({ type: 'GET_STATE' }, {}, state);
    expect(state).toHaveBeenCalledWith(expect.objectContaining({ currentLayout: '2-vertical' }));
  });
});
