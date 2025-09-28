// StreamManager test file

// Mock global objects
global.window = {
  location: {
    href: 'https://tv.youtube.com/watch/123'
  },
  QuadTVMessageBus: {
    subscribe: jest.fn(),
    publish: jest.fn()
  },
  QuadTVStorageManager: {
    savePreset: jest.fn(),
    getPresets: jest.fn(),
    deletePreset: jest.fn()
  },
  QuadTVUIManager: {
    currentLayout: '2x2'
  }
};

global.browser = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

// We'll test the StreamManager logic directly rather than importing

describe('StreamManager', () => {
  let streamManager;

  beforeEach(() => {
    jest.clearAllMocks();
    streamManager = new StreamManager();
  });

  test('should initialize with empty streams', () => {
    expect(streamManager.streams).toEqual([]);
    expect(streamManager.activeAudioStream).toBe(0);
  });

  test('should initialize streams on UI activation', () => {
    streamManager.onUIActivated();

    expect(streamManager.streams).toHaveLength(4);
    expect(streamManager.streams[0].hasAudio).toBe(true);
    expect(streamManager.streams[1].hasAudio).toBe(false);
  });

  test('should set active audio stream', () => {
    streamManager.initializeStreams();
    streamManager.setActiveAudio(2);

    expect(streamManager.activeAudioStream).toBe(2);
    expect(streamManager.streams[2].hasAudio).toBe(true);
    expect(streamManager.streams[0].hasAudio).toBe(false);
    expect(streamManager.streams[1].hasAudio).toBe(false);
    expect(streamManager.streams[3].hasAudio).toBe(false);
  });

  test('should validate YouTube TV URLs', () => {
    expect(streamManager.isValidYouTubeTVUrl('https://tv.youtube.com/watch/123')).toBe(true);
    expect(streamManager.isValidYouTubeTVUrl('https://youtube.com/watch/123')).toBe(false);
    expect(streamManager.isValidYouTubeTVUrl('')).toBe(false);
    expect(streamManager.isValidYouTubeTVUrl(null)).toBe(false);
  });

  test('should set stream URL correctly', async () => {
    streamManager.initializeStreams();
    const testUrl = 'https://tv.youtube.com/watch/abc';

    const result = await streamManager.setStreamUrl(0, testUrl);

    expect(result).toBe(true);
    expect(streamManager.streams[0].url).toBe(testUrl);
    expect(streamManager.streams[0].isLoaded).toBe(true);
  });

  test('should reject invalid URLs', async () => {
    streamManager.initializeStreams();
    const invalidUrl = 'https://invalid.com/watch/abc';

    const result = await streamManager.setStreamUrl(0, invalidUrl);

    expect(result).toBe(false);
    expect(streamManager.streams[0].url).toBe('');
  });

  test('should handle stream actions', () => {
    streamManager.initializeStreams();

    streamManager.handleStreamAction({
      streamIndex: 1,
      action: 'toggle-audio'
    });

    expect(streamManager.activeAudioStream).toBe(1);
  });

  test('should save preset with current state', async () => {
    global.window.QuadTVStorageManager.savePreset.mockResolvedValue(true);
    streamManager.initializeStreams();

    const result = await streamManager.saveAsPreset('Test Preset');

    expect(result).toBe(true);
    expect(global.window.QuadTVStorageManager.savePreset).toHaveBeenCalledWith(
      'Test Preset',
      expect.objectContaining({
        layout: '2x2',
        streams: expect.any(Array),
        activeAudioStream: 0,
        timestamp: expect.any(Number)
      })
    );
  });

  test('should load preset correctly', async () => {
    const mockPreset = {
      layout: '1+3',
      streams: [
        { url: 'https://tv.youtube.com/watch/1', isLoaded: true },
        { url: 'https://tv.youtube.com/watch/2', isLoaded: true },
        { url: '', isLoaded: false },
        { url: '', isLoaded: false }
      ],
      activeAudioStream: 1
    };

    global.window.QuadTVStorageManager.getPresets.mockResolvedValue({
      'Test Preset': mockPreset
    });

    const result = await streamManager.loadPreset('Test Preset');

    expect(result).toBe(true);
    expect(global.window.QuadTVMessageBus.publish).toHaveBeenCalledWith(
      'SET_LAYOUT',
      { layout: '1+3' }
    );
  });

  test('should return stream data', () => {
    streamManager.initializeStreams();
    const data = streamManager.getStreamData();

    expect(data).toHaveProperty('streams');
    expect(data).toHaveProperty('activeAudioStream');
    expect(data.streams).toHaveLength(4);
  });
});