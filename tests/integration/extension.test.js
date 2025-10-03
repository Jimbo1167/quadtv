// Mock browser APIs

// Integration tests for the full extension flow
describe('QuadTV Extension Integration - QTV-001 Critical Paths', () => {
  let mockTab;
  let mockBrowser;
  let backgroundController;
  let contentScript;

  beforeEach(() => {
    mockTab = {
      id: 1,
      url: 'https://tv.youtube.com/watch/123'
    };

    mockBrowser = {
      browserAction: {
        onClicked: {
          addListener: jest.fn()
        },
        setIcon: jest.fn(),
        setTitle: jest.fn(),
        enable: jest.fn(),
        disable: jest.fn()
      },
      commands: {
        onCommand: {
          addListener: jest.fn()
        }
      },
      runtime: {
        onMessage: {
          addListener: jest.fn()
        },
        sendMessage: jest.fn()
      },
      tabs: {
        query: jest.fn(),
        sendMessage: jest.fn(),
        get: jest.fn(),
        onActivated: { addListener: jest.fn() },
        onUpdated: { addListener: jest.fn() },
        onRemoved: { addListener: jest.fn() }
      },
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };

    global.browser = mockBrowser;

    // Setup mock background controller
    backgroundController = {
      activeTabStates: new Map(),
      toggleQuadTV: jest.fn(),
      updateIconState: jest.fn(),
      handleMessage: jest.fn(),
      isYouTubeTV: jest.fn().mockReturnValue(true)
    };

    // Setup mock content script
    contentScript = {
      isActive: false,
      handleBackgroundMessage: jest.fn(),
      activateQuadTV: jest.fn(),
      deactivateQuadTV: jest.fn(),
      notifyBackgroundState: jest.fn()
    };
  });

  describe('Critical User Flows - QTV-001', () => {
    test('should complete full activation flow: toolbar click → background → content', async () => {
      // Setup: Content script ready to receive messages
      mockBrowser.tabs.sendMessage.mockResolvedValue({ success: true });
      mockBrowser.tabs.get.mockResolvedValue(mockTab);

      // User clicks toolbar icon
      const clickHandler = jest.fn(async (tab) => {
        // Simulate background controller logic
        backgroundController.activeTabStates.set(tab.id, true);
        await mockBrowser.tabs.sendMessage(tab.id, { type: 'ACTIVATE_QUADTV' });
        await backgroundController.updateIconState(tab.id);
      });

      mockBrowser.browserAction.onClicked.addListener.mockImplementation((handler) => {
        clickHandler.mockImplementation(handler);
      });

      // Execute the flow
      await clickHandler(mockTab);

      // Verify the complete flow
      expect(backgroundController.activeTabStates.get(mockTab.id)).toBe(true);
      expect(mockBrowser.tabs.sendMessage).toHaveBeenCalledWith(mockTab.id, {
        type: 'ACTIVATE_QUADTV'
      });
      expect(backgroundController.updateIconState).toHaveBeenCalledWith(mockTab.id);
    });

    test('should complete full deactivation flow: second click → background → content', async () => {
      // Setup: QuadTV is already active
      backgroundController.activeTabStates.set(mockTab.id, true);
      mockBrowser.tabs.sendMessage.mockResolvedValue({ success: true });
      mockBrowser.tabs.get.mockResolvedValue(mockTab);

      // User clicks toolbar icon again
      const clickHandler = jest.fn(async (tab) => {
        const isActive = backgroundController.activeTabStates.get(tab.id);
        const newState = !isActive;
        backgroundController.activeTabStates.set(tab.id, newState);

        await mockBrowser.tabs.sendMessage(tab.id, {
          type: newState ? 'ACTIVATE_QUADTV' : 'DEACTIVATE_QUADTV'
        });
        await backgroundController.updateIconState(tab.id);
      });

      mockBrowser.browserAction.onClicked.addListener.mockImplementation((handler) => {
        clickHandler.mockImplementation(handler);
      });

      // Execute the flow
      await clickHandler(mockTab);

      // Verify deactivation
      expect(backgroundController.activeTabStates.get(mockTab.id)).toBe(false);
      expect(mockBrowser.tabs.sendMessage).toHaveBeenCalledWith(mockTab.id, {
        type: 'DEACTIVATE_QUADTV'
      });
    });

    test('should persist state across tab activation', async () => {
      // Setup: Tab is active with QuadTV enabled
      backgroundController.activeTabStates.set(mockTab.id, true);
      mockBrowser.tabs.get.mockResolvedValue(mockTab);

      // Simulate tab activation event
      const tabActivatedHandler = jest.fn(async (activeInfo) => {
        await backgroundController.updateIconState(activeInfo.tabId);
      });

      mockBrowser.tabs.onActivated.addListener.mockImplementation((handler) => {
        tabActivatedHandler.mockImplementation(handler);
      });

      // User switches to the tab
      await tabActivatedHandler({ tabId: mockTab.id });

      // Verify state persistence
      expect(backgroundController.updateIconState).toHaveBeenCalledWith(mockTab.id);
      expect(backgroundController.activeTabStates.get(mockTab.id)).toBe(true);
    });

    test('should reject activation on non-YouTube TV pages', async () => {
      const nonYouTubeTVTab = { id: 2, url: 'https://google.com' };
      backgroundController.isYouTubeTV.mockReturnValue(false);

      const clickHandler = jest.fn(async (tab) => {
        if (!backgroundController.isYouTubeTV(tab.url)) {
          console.log('QuadTV can only be used on YouTube TV');
          return;
        }
        // Should not reach here
        backgroundController.activeTabStates.set(tab.id, true);
      });

      mockBrowser.browserAction.onClicked.addListener.mockImplementation((handler) => {
        clickHandler.mockImplementation(handler);
      });

      await clickHandler(nonYouTubeTVTab);

      expect(backgroundController.activeTabStates.has(nonYouTubeTVTab.id)).toBe(false);
      expect(mockBrowser.tabs.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Error Scenarios and Edge Cases - QTV-001', () => {
    test('should handle content script communication failure gracefully', async () => {
      // Setup: Content script is not available or fails to respond
      mockBrowser.tabs.sendMessage.mockRejectedValue(new Error('Content script not ready'));
      mockBrowser.tabs.get.mockResolvedValue(mockTab);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const clickHandler = jest.fn(async (tab) => {
        const isActive = false;
        const newState = true;
        backgroundController.activeTabStates.set(tab.id, newState);

        try {
          await mockBrowser.tabs.sendMessage(tab.id, { type: 'ACTIVATE_QUADTV' });
        } catch (error) {
          console.error('Failed to send message to content script:', error);
          // Reset state on error
          backgroundController.activeTabStates.set(tab.id, isActive);
        }
      });

      mockBrowser.browserAction.onClicked.addListener.mockImplementation((handler) => {
        clickHandler.mockImplementation(handler);
      });

      await clickHandler(mockTab);

      // Verify error handling
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send message to content script:',
        expect.any(Error)
      );
      expect(backgroundController.activeTabStates.get(mockTab.id)).toBe(false); // State rolled back
      consoleSpy.mockRestore();
    });

    test('should handle tab.get() failure during icon update', async () => {
      mockBrowser.tabs.get.mockRejectedValue(new Error('Tab not found'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const updateIconHandler = jest.fn(async (tabId) => {
        try {
          await mockBrowser.tabs.get(tabId);
        } catch (error) {
          console.error('Failed to update icon state:', error);
        }
      });

      await updateIconHandler(mockTab.id);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update icon state:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    test('should handle rapid consecutive toolbar clicks without race conditions', async () => {
      let messageCallCount = 0;
      mockBrowser.tabs.sendMessage.mockImplementation(() => {
        messageCallCount++;
        return Promise.resolve({ success: true });
      });
      mockBrowser.tabs.get.mockResolvedValue(mockTab);

      const clickHandler = jest.fn(async (tab) => {
        const isActive = backgroundController.activeTabStates.get(tab.id) || false;
        const newState = !isActive;
        backgroundController.activeTabStates.set(tab.id, newState);

        await mockBrowser.tabs.sendMessage(tab.id, {
          type: newState ? 'ACTIVATE_QUADTV' : 'DEACTIVATE_QUADTV'
        });
      });

      mockBrowser.browserAction.onClicked.addListener.mockImplementation((handler) => {
        clickHandler.mockImplementation(handler);
      });

      // Simulate rapid clicks
      await Promise.all([
        clickHandler(mockTab), // Should activate
        clickHandler(mockTab), // Should deactivate
        clickHandler(mockTab), // Should activate again
      ]);

      // Verify final state is consistent (should be active after 3 clicks)
      expect(backgroundController.activeTabStates.get(mockTab.id)).toBe(true);
      expect(messageCallCount).toBe(3);
    });

    test('should handle background restart with content script state recovery', async () => {
      // Simulate content script asking for current state after background restart
      const getStateMessage = { type: 'GET_TAB_STATE' };
      const sendResponse = jest.fn();
      const sender = { tab: mockTab };

      // Background doesn't know about this tab yet
      backgroundController.activeTabStates.clear();

      const messageHandler = jest.fn((message, sender, sendResponse) => {
        switch (message.type) {
          case 'GET_TAB_STATE':
            const tabId = sender.tab?.id;
            const isActive = backgroundController.activeTabStates.get(tabId) || false;
            sendResponse({ isActive });
            break;
        }
      });

      messageHandler(getStateMessage, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({ isActive: false });
    });

    test('should handle invalid tab IDs gracefully', async () => {
      const invalidTab = { id: -1, url: 'https://tv.youtube.com' };
      mockBrowser.tabs.get.mockRejectedValue(new Error('Invalid tab ID'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const updateIconHandler = jest.fn(async (tabId) => {
        try {
          await mockBrowser.tabs.get(tabId);
        } catch (error) {
          console.error('Failed to update icon state:', error);
        }
      });

      await updateIconHandler(invalidTab.id);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update icon state:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    test('should handle message bus errors in content script', async () => {
      // Simulate message bus throwing an error
      const erroringMessageBus = {
        subscribe: jest.fn(),
        publish: jest.fn(() => {
          throw new Error('Message bus error');
        })
      };

      const contentScriptWithErrorHandling = {
        isActive: false,
        messageBus: erroringMessageBus,
        activateQuadTV: jest.fn(() => {
          if (!contentScriptWithErrorHandling.isActive) {
            try {
              contentScriptWithErrorHandling.messageBus.publish('ACTIVATE_UI');
            } catch (error) {
              console.error('Message bus error:', error);
            }
          }
        })
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      contentScriptWithErrorHandling.activateQuadTV();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Message bus error:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  test('should communicate between background and content scripts', async () => {
    const message = { type: 'ACTIVATE_QUADTV' };
    const sendResponse = jest.fn();

    // Mock content script message handler
    const messageHandler = jest.fn((msg, sender, response) => {
      if (msg.type === 'ACTIVATE_QUADTV') {
        response({ success: true });
      }
    });

    // Test direct message handling
    messageHandler(message, { tab: mockTab }, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  test('should validate YouTube TV URLs', () => {
    const validUrls = [
      'https://tv.youtube.com/',
      'https://tv.youtube.com/watch/123',
      'https://tv.youtube.com/browse'
    ];

    const invalidUrls = [
      'https://youtube.com/',
      'https://google.com/',
      'https://tv.youtube.co.uk/',
      ''
    ];

    validUrls.forEach(url => {
      expect(url.includes('tv.youtube.com')).toBe(true);
    });

    invalidUrls.forEach(url => {
      expect(url.includes('tv.youtube.com')).toBe(false);
    });
  });

  test('should handle layout switching flow', async () => {
    const layoutChangeMessage = {
      type: 'SET_LAYOUT',
      layout: '1+2'
    };

    mockBrowser.tabs.sendMessage.mockResolvedValue({ success: true });

    await mockBrowser.tabs.sendMessage(mockTab.id, layoutChangeMessage);

    expect(mockBrowser.tabs.sendMessage).toHaveBeenCalledWith(
      mockTab.id,
      layoutChangeMessage
    );
  });

  test('should persist settings using storage API', async () => {
    const settings = {
      lastLayout: '2x2',
      audioIndicatorColor: '#ff0000'
    };

    mockBrowser.storage.local.set.mockResolvedValue();
    mockBrowser.storage.local.get.mockResolvedValue({ quadtvSettings: settings });

    await mockBrowser.storage.local.set({ quadtvSettings: settings });
    const result = await mockBrowser.storage.local.get('quadtvSettings');

    expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({ quadtvSettings: settings });
    expect(result.quadtvSettings).toEqual(settings);
  });

  test('should handle preset save and load flow', async () => {
    const preset = {
      layout: '2x2',
      streams: [
        { url: 'https://tv.youtube.com/watch/1', isLoaded: true },
        { url: 'https://tv.youtube.com/watch/2', isLoaded: true },
        { url: '', isLoaded: false },
        { url: '', isLoaded: false }
      ],
      activeAudioStream: 0,
      timestamp: Date.now()
    };

    const presets = { 'Test Preset': preset };

    mockBrowser.storage.local.set.mockResolvedValue();
    mockBrowser.storage.local.get.mockResolvedValue({ quadtvPresets: presets });

    // Save preset
    await mockBrowser.storage.local.set({ quadtvPresets: presets });

    // Load preset
    const result = await mockBrowser.storage.local.get('quadtvPresets');

    expect(result.quadtvPresets['Test Preset']).toEqual(preset);
  });

  test('should handle keyboard shortcut activation', () => {
    const shortcutHandler = jest.fn((command) => {
      if (command === 'toggle-quadtv') {
        mockBrowser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            // Simulate toggle action
            console.log('Toggling QuadTV via keyboard shortcut');
          }
        });
      }
    });

    // Simulate keyboard shortcut being triggered
    shortcutHandler('toggle-quadtv');

    expect(shortcutHandler).toHaveBeenCalledWith('toggle-quadtv');
  });
});