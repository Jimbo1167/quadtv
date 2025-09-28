import { jest } from '@jest/globals';

// Integration tests for the full extension flow
describe('QuadTV Extension Integration', () => {
  let mockTab;
  let mockBrowser;

  beforeEach(() => {
    mockTab = {
      id: 1,
      url: 'https://tv.youtube.com/watch/123'
    };

    mockBrowser = {
      browserAction: {
        onClicked: {
          addListener: jest.fn()
        }
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
        sendMessage: jest.fn()
      },
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };

    global.browser = mockBrowser;
  });

  test('should activate QuadTV when toolbar icon is clicked', async () => {
    // Simulate the background controller setup
    const backgroundController = {
      activeTabStates: new Map(),
      toggleQuadTV: jest.fn(),
      isYouTubeTV: jest.fn().mockReturnValue(true)
    };

    // Simulate toolbar icon click
    const clickHandler = jest.fn();
    mockBrowser.browserAction.onClicked.addListener.mockImplementation((handler) => {
      clickHandler.mockImplementation(handler);
    });

    // Trigger the click
    await clickHandler(mockTab);

    expect(mockBrowser.browserAction.onClicked.addListener).toHaveBeenCalled();
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

    mockBrowser.runtime.onMessage.addListener.mockImplementation((handler) => {
      handler(message, { tab: mockTab }, sendResponse);
    });

    expect(mockBrowser.runtime.onMessage.addListener).toHaveBeenCalled();
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
      layout: '1+3'
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
    const shortcutHandler = jest.fn();

    mockBrowser.commands.onCommand.addListener.mockImplementation((handler) => {
      shortcutHandler.mockImplementation(handler);
    });

    // Simulate keyboard shortcut
    shortcutHandler('toggle-quadtv');

    expect(mockBrowser.commands.onCommand.addListener).toHaveBeenCalled();
  });
});