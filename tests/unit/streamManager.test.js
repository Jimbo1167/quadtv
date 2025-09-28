// StreamManager test file - Multi-Tab Architecture

// Mock browser API
global.browser = {
  runtime: {
    sendMessage: jest.fn().mockResolvedValue({ success: true })
  }
};

// Mock global objects
global.window = {
  location: {
    href: 'https://tv.youtube.com/watch/123'
  },
  quadTVCurrentTabId: 123,
  QuadTVMessageBus: {
    subscribe: jest.fn(),
    publish: jest.fn()
  },
  QuadTVStorageManager: {
    savePreset: jest.fn(),
    getPresets: jest.fn(),
    deletePreset: jest.fn()
  }
};

// Import StreamManager
const { StreamManager } = require('../../src/content/streamManager.js');

describe('StreamManager', () => {
  let streamManager;

  beforeEach(() => {
    jest.clearAllMocks();
    streamManager = new StreamManager();
  });

  test('should initialize with empty tab mapping', () => {
    expect(streamManager.streamTabs.size).toBe(0);
    expect(streamManager.activeAudioTab).toBe(null);
    expect(streamManager.currentStreamIndex).toBe(null);
  });

  test('should handle QuadTV activation with tab mapping', () => {
    const activationData = {
      streamTabs: [[0, 123], [1, 124], [2, 125], [3, 126]],
      activeAudioTab: 123
    };

    streamManager.onQuadTVActivated(activationData);

    expect(streamManager.streamTabs.size).toBe(4);
    expect(streamManager.streamTabs.get(0)).toBe(123);
    expect(streamManager.activeAudioTab).toBe(123);
    expect(streamManager.currentStreamIndex).toBe(0); // Current tab is 123, which is stream 0
  });

  test('should handle audio changes', () => {
    streamManager.onAudioChanged({ activeAudioTab: 125 });
    expect(streamManager.activeAudioTab).toBe(125);
  });

  test('should validate YouTube TV URLs', () => {
    expect(streamManager.isValidYouTubeTVUrl('https://tv.youtube.com/watch/123')).toBe(true);
    expect(streamManager.isValidYouTubeTVUrl('https://youtube.com/watch/123')).toBe(false);
    expect(streamManager.isValidYouTubeTVUrl('')).toBe(false);
    expect(streamManager.isValidYouTubeTVUrl(null)).toBe(false);
  });

  test('should navigate to valid YouTube TV URLs', async () => {
    const testUrl = 'https://tv.youtube.com/watch/abc';
    
    // Mock window.location.href setter
    delete window.location;
    window.location = { href: '' };

    const result = await streamManager.navigateToUrl(testUrl);

    expect(result).toBe(true);
    expect(window.location.href).toBe(testUrl);
  });

  test('should reject invalid URLs for navigation', async () => {
    const invalidUrl = 'https://invalid.com/watch/abc';

    const result = await streamManager.navigateToUrl(invalidUrl);

    expect(result).toBe(false);
  });

  test('should request audio switch through browser API', () => {
    streamManager.requestAudioSwitch(2);

    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'SWITCH_AUDIO',
      streamIndex: 2
    });
  });

  test('should save preset through browser API', async () => {
    browser.runtime.sendMessage.mockResolvedValue({ 
      success: true, 
      preset: { name: 'Test Preset' } 
    });

    const result = await streamManager.saveAsPreset('Test Preset');

    expect(result).toBe(true);
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'SAVE_PRESET',
      name: 'Test Preset'
    });
    expect(global.window.QuadTVMessageBus.publish).toHaveBeenCalledWith('PRESET_SAVED', {
      name: 'Test Preset',
      preset: { name: 'Test Preset' }
    });
  });

  test('should load preset through browser API', async () => {
    browser.runtime.sendMessage.mockResolvedValue({ 
      success: true, 
      preset: { name: 'Test Preset' } 
    });

    const result = await streamManager.loadPreset('Test Preset');

    expect(result).toBe(true);
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'LOAD_PRESET',
      name: 'Test Preset'
    });
    expect(global.window.QuadTVMessageBus.publish).toHaveBeenCalledWith('PRESET_LOADED', {
      name: 'Test Preset',
      preset: { name: 'Test Preset' }
    });
  });

  test('should return stream data with tab information', () => {
    const activationData = {
      streamTabs: [[0, 123], [1, 124], [2, 125], [3, 126]],
      activeAudioTab: 125
    };
    streamManager.onQuadTVActivated(activationData);

    const data = streamManager.getStreamData();

    expect(data).toEqual({
      streamTabs: [[0, 123], [1, 124], [2, 125], [3, 126]],
      activeAudioTab: 125,
      currentStreamIndex: 0
    });
  });

  test('should provide tab info for current tab', () => {
    const activationData = {
      streamTabs: [[0, 123], [1, 124], [2, 125], [3, 126]],
      activeAudioTab: 123
    };
    streamManager.onQuadTVActivated(activationData);

    const tabInfo = streamManager.getTabInfo();

    expect(tabInfo).toEqual({
      streamIndex: 0,
      isAudioActive: true,
      totalStreams: 4
    });
  });

  test('should handle deactivation correctly', () => {
    const activationData = {
      streamTabs: [[0, 123], [1, 124], [2, 125], [3, 126]],
      activeAudioTab: 123
    };
    streamManager.onQuadTVActivated(activationData);
    
    streamManager.onQuadTVDeactivated();

    expect(streamManager.streamTabs.size).toBe(0);
    expect(streamManager.activeAudioTab).toBe(null);
    expect(streamManager.currentStreamIndex).toBe(null);
  });
});