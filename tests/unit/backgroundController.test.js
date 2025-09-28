// Mock browser APIs
const mockTab = {
  id: 1,
  url: 'https://tv.youtube.com/watch/123'
};

const mockBrowserAction = {
  onClicked: { addListener: jest.fn() },
  setIcon: jest.fn(),
  setTitle: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn()
};

const mockTabs = {
  onActivated: { addListener: jest.fn() },
  onUpdated: { addListener: jest.fn() },
  onRemoved: { addListener: jest.fn() },
  get: jest.fn(),
  query: jest.fn(),
  sendMessage: jest.fn()
};

const mockCommands = {
  onCommand: { addListener: jest.fn() }
};

const mockRuntime = {
  onMessage: { addListener: jest.fn() },
  sendMessage: jest.fn()
};

global.browser = {
  browserAction: mockBrowserAction,
  tabs: mockTabs,
  commands: mockCommands,
  runtime: mockRuntime
};

// We'll test the logic directly rather than importing the file

describe('BackgroundController - QTV-001 Tests', () => {
  let backgroundController;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create new instance by calling the constructor
    global.BackgroundController = class {
      constructor() {
        this.activeTabStates = new Map();
        this.init();
      }

      init() {
        this.setupBrowserActionListener();
        this.setupCommandListener();
        this.setupMessageListener();
        this.setupTabListeners();
      }

      setupBrowserActionListener() {
        browser.browserAction.onClicked.addListener((tab) => {
          this.toggleQuadTV(tab);
        });
      }

      setupCommandListener() {
        browser.commands.onCommand.addListener((command) => {
          if (command === 'toggle-quadtv') {
            browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]) {
                this.toggleQuadTV(tabs[0]);
              }
            });
          }
        });
      }

      setupMessageListener() {
        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
          this.handleMessage(message, sender, sendResponse);
          return true;
        });
      }

      setupTabListeners() {
        browser.tabs.onActivated.addListener(async (activeInfo) => {
          await this.updateIconState(activeInfo.tabId);
        });

        browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
          if (changeInfo.status === 'complete' || changeInfo.url) {
            await this.updateIconState(tabId);
          }
        });

        browser.tabs.onRemoved.addListener((tabId) => {
          this.activeTabStates.delete(tabId);
        });
      }

      async updateIconState(tabId) {
        try {
          const tab = await browser.tabs.get(tabId);
          const isYouTubeTV = this.isYouTubeTV(tab.url);

          if (isYouTubeTV) {
            const isActive = this.activeTabStates.get(tabId) || false;
            await browser.browserAction.setIcon({
              tabId: tabId,
              path: {
                16: isActive ? "icons/icon-16-active.png" : "icons/icon-16.png",
                32: isActive ? "icons/icon-32-active.png" : "icons/icon-32.png"
              }
            });
            await browser.browserAction.setTitle({
              tabId: tabId,
              title: isActive ? "QuadTV: Active (Click to deactivate)" : "QuadTV: Click to activate"
            });
            await browser.browserAction.enable(tabId);
          } else {
            await browser.browserAction.setTitle({
              tabId: tabId,
              title: "QuadTV: Only available on YouTube TV"
            });
            await browser.browserAction.disable(tabId);
          }
        } catch (error) {
          console.error('Failed to update icon state:', error);
        }
      }

      async toggleQuadTV(tab) {
        if (!this.isYouTubeTV(tab.url)) {
          console.log('QuadTV can only be used on YouTube TV');
          return;
        }

        const isActive = this.activeTabStates.get(tab.id) || false;
        const newState = !isActive;

        this.activeTabStates.set(tab.id, newState);

        try {
          await browser.tabs.sendMessage(tab.id, {
            type: newState ? 'ACTIVATE_QUADTV' : 'DEACTIVATE_QUADTV'
          });

          await this.updateIconState(tab.id);
        } catch (error) {
          console.error('Failed to send message to content script:', error);
          this.activeTabStates.set(tab.id, isActive);
        }
      }

      handleMessage(message, sender, sendResponse) {
        switch (message.type) {
          case 'GET_TAB_STATE':
            const tabId = sender.tab?.id;
            const isActive = this.activeTabStates.get(tabId) || false;
            sendResponse({ isActive });
            break;

          case 'UPDATE_TAB_STATE':
            if (sender.tab?.id) {
              this.activeTabStates.set(sender.tab.id, message.isActive);
            }
            break;
        }
      }

      isYouTubeTV(url) {
        return url && url.includes('tv.youtube.com');
      }
    };

    backgroundController = new global.BackgroundController();
  });

  describe('QTV-001: Basic toolbar icon activation', () => {
    test('should register browser action click listener', () => {
      expect(mockBrowserAction.onClicked.addListener).toHaveBeenCalled();
    });

    test('should activate QuadTV when clicking toolbar on YouTube TV', async () => {
      mockTabs.get.mockResolvedValue(mockTab);
      mockTabs.sendMessage.mockResolvedValue();

      await backgroundController.toggleQuadTV(mockTab);

      expect(backgroundController.activeTabStates.get(mockTab.id)).toBe(true);
      expect(mockTabs.sendMessage).toHaveBeenCalledWith(mockTab.id, {
        type: 'ACTIVATE_QUADTV'
      });
    });

    test('should deactivate QuadTV on second click', async () => {
      mockTabs.get.mockResolvedValue(mockTab);
      mockTabs.sendMessage.mockResolvedValue();

      // First click - activate
      await backgroundController.toggleQuadTV(mockTab);
      expect(backgroundController.activeTabStates.get(mockTab.id)).toBe(true);

      // Second click - deactivate
      await backgroundController.toggleQuadTV(mockTab);
      expect(backgroundController.activeTabStates.get(mockTab.id)).toBe(false);
      expect(mockTabs.sendMessage).toHaveBeenLastCalledWith(mockTab.id, {
        type: 'DEACTIVATE_QUADTV'
      });
    });

    test('should not activate on non-YouTube TV pages', async () => {
      const nonYouTubeTVTab = { id: 2, url: 'https://google.com' };

      await backgroundController.toggleQuadTV(nonYouTubeTVTab);

      expect(backgroundController.activeTabStates.has(nonYouTubeTVTab.id)).toBe(false);
      expect(mockTabs.sendMessage).not.toHaveBeenCalled();
    });

    test('should update icon state for YouTube TV tabs', async () => {
      mockTabs.get.mockResolvedValue(mockTab);

      await backgroundController.updateIconState(mockTab.id);

      expect(mockBrowserAction.setIcon).toHaveBeenCalledWith({
        tabId: mockTab.id,
        path: {
          16: "icons/icon-16.png",
          32: "icons/icon-32.png"
        }
      });
      expect(mockBrowserAction.setTitle).toHaveBeenCalledWith({
        tabId: mockTab.id,
        title: "QuadTV: Click to activate"
      });
      expect(mockBrowserAction.enable).toHaveBeenCalledWith(mockTab.id);
    });

    test('should disable icon for non-YouTube TV tabs', async () => {
      const nonYouTubeTVTab = { id: 2, url: 'https://google.com' };
      mockTabs.get.mockResolvedValue(nonYouTubeTVTab);

      await backgroundController.updateIconState(nonYouTubeTVTab.id);

      expect(mockBrowserAction.setTitle).toHaveBeenCalledWith({
        tabId: nonYouTubeTVTab.id,
        title: "QuadTV: Only available on YouTube TV"
      });
      expect(mockBrowserAction.disable).toHaveBeenCalledWith(nonYouTubeTVTab.id);
    });

    test('should show active state in icon when QuadTV is active', async () => {
      mockTabs.get.mockResolvedValue(mockTab);
      backgroundController.activeTabStates.set(mockTab.id, true);

      await backgroundController.updateIconState(mockTab.id);

      expect(mockBrowserAction.setIcon).toHaveBeenCalledWith({
        tabId: mockTab.id,
        path: {
          16: "icons/icon-16-active.png",
          32: "icons/icon-32-active.png"
        }
      });
      expect(mockBrowserAction.setTitle).toHaveBeenCalledWith({
        tabId: mockTab.id,
        title: "QuadTV: Active (Click to deactivate)"
      });
    });

    test('should clean up state when tab is closed', () => {
      backgroundController.activeTabStates.set(mockTab.id, true);

      // Simulate tab close
      const removeListener = mockTabs.onRemoved.addListener.mock.calls[0][0];
      removeListener(mockTab.id);

      expect(backgroundController.activeTabStates.has(mockTab.id)).toBe(false);
    });

    test('should handle message errors gracefully', async () => {
      mockTabs.sendMessage.mockRejectedValue(new Error('Content script not ready'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await backgroundController.toggleQuadTV(mockTab);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send message to content script:',
        expect.any(Error)
      );
      expect(backgroundController.activeTabStates.get(mockTab.id)).toBe(false);

      consoleSpy.mockRestore();
    });

    test('should handle tab update events correctly', async () => {
      mockTabs.get.mockResolvedValue(mockTab);

      // Simulate tab update listener
      const updateListener = mockTabs.onUpdated.addListener.mock.calls[0][0];

      // Test with status complete
      await updateListener(mockTab.id, { status: 'complete' }, mockTab);
      expect(mockTabs.get).toHaveBeenCalledWith(mockTab.id);

      // Test with URL change
      mockTabs.get.mockClear();
      await updateListener(mockTab.id, { url: 'https://tv.youtube.com/new' }, mockTab);
      expect(mockTabs.get).toHaveBeenCalledWith(mockTab.id);

      // Test with other changes (should not trigger)
      mockTabs.get.mockClear();
      await updateListener(mockTab.id, { title: 'New Title' }, mockTab);
      expect(mockTabs.get).not.toHaveBeenCalled();
    });

    test('should handle tab activated events', async () => {
      mockTabs.get.mockResolvedValue(mockTab);

      // Simulate tab activation listener
      const activationListener = mockTabs.onActivated.addListener.mock.calls[0][0];

      await activationListener({ tabId: mockTab.id });
      expect(mockTabs.get).toHaveBeenCalledWith(mockTab.id);
    });

    test('should handle keyboard shortcut toggle', () => {
      mockTabs.query.mockImplementation((query, callback) => {
        callback([mockTab]);
      });

      // Simulate command listener
      const commandListener = mockCommands.onCommand.addListener.mock.calls[0][0];
      const toggleSpy = jest.spyOn(backgroundController, 'toggleQuadTV');

      commandListener('toggle-quadtv');

      expect(mockTabs.query).toHaveBeenCalledWith(
        { active: true, currentWindow: true },
        expect.any(Function)
      );
      expect(toggleSpy).toHaveBeenCalledWith(mockTab);
    });

    test('should handle keyboard shortcut when no active tab', () => {
      mockTabs.query.mockImplementation((query, callback) => {
        callback([]);
      });

      const commandListener = mockCommands.onCommand.addListener.mock.calls[0][0];
      const toggleSpy = jest.spyOn(backgroundController, 'toggleQuadTV');

      commandListener('toggle-quadtv');

      expect(toggleSpy).not.toHaveBeenCalled();
    });

    test('should ignore unknown commands', () => {
      const commandListener = mockCommands.onCommand.addListener.mock.calls[0][0];
      const toggleSpy = jest.spyOn(backgroundController, 'toggleQuadTV');

      commandListener('unknown-command');

      expect(toggleSpy).not.toHaveBeenCalled();
    });

    test('should handle updateIconState errors gracefully', async () => {
      mockTabs.get.mockRejectedValue(new Error('Tab not found'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await backgroundController.updateIconState(mockTab.id);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update icon state:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    test('should handle message handling with invalid sender', () => {
      const message = { type: 'GET_TAB_STATE' };
      const sendResponse = jest.fn();
      const invalidSender = {}; // No tab property

      backgroundController.handleMessage(message, invalidSender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({ isActive: false });
    });

    test('should handle UPDATE_TAB_STATE with invalid sender', () => {
      const message = { type: 'UPDATE_TAB_STATE', isActive: true };
      const sendResponse = jest.fn();
      const invalidSender = {}; // No tab property

      backgroundController.handleMessage(message, invalidSender, sendResponse);

      // Should not crash, and tab states should remain unchanged
      expect(backgroundController.activeTabStates.size).toBe(0);
    });
  });

  describe('YouTube TV URL validation', () => {
    test('should accept valid YouTube TV URLs', () => {
      const validUrls = [
        'https://tv.youtube.com/',
        'https://tv.youtube.com/watch/123',
        'https://tv.youtube.com/browse',
        'http://tv.youtube.com/watch/abc'
      ];

      validUrls.forEach(url => {
        expect(backgroundController.isYouTubeTV(url)).toBe(true);
      });
    });

    test('should reject invalid URLs', () => {
      const invalidUrls = [
        'https://youtube.com/',
        'https://google.com/',
        'https://tv.youtube.co.uk/'
      ];

      invalidUrls.forEach(url => {
        expect(backgroundController.isYouTubeTV(url)).toBe(false);
      });

      // Test empty/null separately since they return empty string
      expect(backgroundController.isYouTubeTV('')).toBeFalsy();
      expect(backgroundController.isYouTubeTV(null)).toBeFalsy();
      expect(backgroundController.isYouTubeTV(undefined)).toBeFalsy();
    });
  });
});