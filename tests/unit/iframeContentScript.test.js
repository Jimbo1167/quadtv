/**
 * QTV-026: Iframe Content Script Tests
 */

// Mock DOM and browser APIs
global.document = {
  readyState: 'complete',
  addEventListener: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn().mockReturnValue([])
};

global.window = {
  self: {},
  top: { different: 'object' }, // Mock iframe context
  location: { href: 'https://tv.youtube.com/watch?v=test' },
  addEventListener: jest.fn(),
  QuadTVMessageProtocol: class MockMessageProtocol {
    constructor() {
      this.handlers = new Map();
    }
    init() {}
    onMessage(type, handler) {
      if (!this.handlers.has(type)) {
        this.handlers.set(type, []);
      }
      this.handlers.get(type).push(handler);
    }
    async sendToParent(type, payload) {
      return Promise.resolve();
    }
    destroy() {}
  }
};

const IframeContentManager = require('../../src/content/iframeContentScript.js');

describe('QTV-026: Iframe Content Script', () => {
  let manager;
  let mockVideo;
  let instances = []; // Track all instances for cleanup

  // Helper to create and track manager instances
  const createManager = () => {
    const instance = new IframeContentManager();
    instances.push(instance);
    return instance;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    instances = [];

    mockVideo = {
      muted: false,
      volume: 1.0,
      videoWidth: 1920,
      videoHeight: 1080,
      duration: 120,
      paused: false,
      addEventListener: jest.fn(),
      play: jest.fn().mockResolvedValue(),
      pause: jest.fn()
    };

    // Mock video element detection
    global.document.querySelector = jest.fn((selector) => {
      if (selector === 'video') {
        return mockVideo;
      }
      return null;
    });

    global.document.querySelectorAll = jest.fn((selector) => {
      if (selector.includes('video')) {
        return [mockVideo];
      }
      return [];
    });
  });

  afterEach(() => {
    // Clean up all instances
    instances.forEach(instance => {
      if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
      }
    });
    if (manager) {
      manager.destroy();
    }
    // Clear all timers to prevent Jest open handles
    jest.clearAllTimers();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    test('should initialize in iframe context', () => {
      manager = createManager();

      expect(manager.streamIndex).toBeNull();
      expect(manager.hasAudio).toBe(false);
      expect(manager.isReady).toBe(false);
    });

    test('should setup message handlers', () => {
      manager = createManager();

      expect(manager.messageProtocol).toBeDefined();
      expect(manager.messageProtocol.handlers.has('IFRAME_READY_CHECK')).toBe(true);
      expect(manager.messageProtocol.handlers.has('SET_AUDIO_STATE')).toBe(true);
    });
  });

  describe('Video Detection', () => {
    test('should detect video element on initialization', () => {
      manager = createManager();
      manager.detectVideoElement();

      expect(manager.videoElement).toBe(mockVideo);
      expect(mockVideo.addEventListener).toHaveBeenCalledWith('volumechange', expect.any(Function));
    });

    test('should handle video element not found', () => {
      global.document.querySelector.mockReturnValue(null);
      global.document.querySelectorAll.mockReturnValue([]);

      manager = createManager();
      manager.detectVideoElement();

      expect(manager.videoElement).toBeNull();
    });

    test('should select video with dimensions over empty video', () => {
      const emptyVideo = {
        ...mockVideo,
        videoWidth: 0,
        videoHeight: 0
      };

      global.document.querySelectorAll.mockReturnValue([emptyVideo, mockVideo]);

      manager = createManager();
      manager.detectVideoElement();

      expect(manager.videoElement).toBe(mockVideo);
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      manager = createManager();
    });

    test('should handle IFRAME_READY_CHECK message', () => {
      const readyCheckHandler = manager.messageProtocol.handlers.get('IFRAME_READY_CHECK')[0];

      readyCheckHandler({ streamIndex: 2 });

      expect(manager.streamIndex).toBe(2);
    });

    test('should handle SET_AUDIO_STATE message', () => {
      manager.videoElement = mockVideo;
      const audioStateHandler = manager.messageProtocol.handlers.get('SET_AUDIO_STATE')[0];

      audioStateHandler({ hasAudio: true });

      expect(manager.hasAudio).toBe(true);
      expect(mockVideo.muted).toBe(false);
      expect(mockVideo.volume).toBe(1.0);
    });

    test('should handle SET_AUDIO_STATE mute', () => {
      manager.videoElement = mockVideo;
      const audioStateHandler = manager.messageProtocol.handlers.get('SET_AUDIO_STATE')[0];

      audioStateHandler({ hasAudio: false });

      expect(manager.hasAudio).toBe(false);
      expect(mockVideo.muted).toBe(true);
    });

    test('should handle GET_AUDIO_STATE query', () => {
      manager.streamIndex = 1;
      manager.hasAudio = true;
      manager.videoElement = mockVideo;

      const queryHandler = manager.messageProtocol.handlers.get('GET_AUDIO_STATE')[0];
      const response = queryHandler({});

      expect(response).toEqual({
        streamIndex: 1,
        hasAudio: true,
        hasVideo: true
      });
    });
  });

  describe('Audio Control', () => {
    beforeEach(() => {
      manager = createManager();
      manager.videoElement = mockVideo;
    });

    test('should apply audio state correctly', () => {
      manager.setAudioState(true);

      expect(manager.hasAudio).toBe(true);
      expect(mockVideo.muted).toBe(false);
      expect(mockVideo.volume).toBe(1.0);
    });

    test('should mute audio correctly', () => {
      manager.setAudioState(false);

      expect(manager.hasAudio).toBe(false);
      expect(mockVideo.muted).toBe(true);
    });

    test('should attempt to play video when unmuting', () => {
      mockVideo.paused = true;
      manager.setAudioState(true);

      expect(mockVideo.play).toHaveBeenCalled();
    });

    test('should handle play failure gracefully', () => {
      mockVideo.paused = true;
      mockVideo.play.mockRejectedValue(new Error('Play failed'));

      expect(() => manager.setAudioState(true)).not.toThrow();
    });

    test('should handle missing video element', () => {
      manager.videoElement = null;

      expect(() => manager.setAudioState(true)).not.toThrow();
      expect(manager.hasAudio).toBe(true); // State should still update
    });
  });

  describe('Volume Change Detection', () => {
    beforeEach(() => {
      manager = createManager();
      manager.videoElement = mockVideo;
      manager.hasAudio = true;
    });

    test('should detect external mute', () => {
      // Simulate external mute
      mockVideo.muted = true;
      manager.onVolumeChange();

      expect(manager.hasAudio).toBe(false);
    });

    test('should detect external unmute', () => {
      manager.hasAudio = false;
      mockVideo.muted = false;
      manager.onVolumeChange();

      expect(manager.hasAudio).toBe(true);
    });

    test('should detect volume change to zero', () => {
      mockVideo.volume = 0;
      manager.onVolumeChange();

      expect(manager.hasAudio).toBe(false);
    });
  });

  describe('Parent Communication', () => {
    beforeEach(() => {
      manager = createManager();
      manager.streamIndex = 0;
    });

    test('should notify parent when ready', async () => {
      const sendSpy = jest.spyOn(manager.messageProtocol, 'sendToParent');

      await manager.notifyReady();

      expect(sendSpy).toHaveBeenCalledWith('IFRAME_READY', {
        streamIndex: 0,
        hasVideo: true,
        url: 'https://tv.youtube.com/watch?v=test'
      });
    });

    test('should notify parent of audio state changes', async () => {
      manager.videoElement = mockVideo;
      manager.hasAudio = true;
      // Ensure video state matches hasAudio
      mockVideo.muted = false;
      const sendSpy = jest.spyOn(manager.messageProtocol, 'sendToParent');

      await manager.notifyAudioStateChanged();

      expect(sendSpy).toHaveBeenCalledWith('AUDIO_STATE_CHANGED', {
        streamIndex: 0,
        hasAudio: true,
        actualMuted: false,
        actualVolume: 1.0
      });
    });

    test('should notify parent when video found', async () => {
      const sendSpy = jest.spyOn(manager.messageProtocol, 'sendToParent');

      await manager.onVideoFound(mockVideo);

      expect(sendSpy).toHaveBeenCalledWith('VIDEO_FOUND', {
        streamIndex: 0,
        videoWidth: 1920,
        videoHeight: 1080,
        duration: 120
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      manager = createManager();
      manager.streamIndex = 0;
    });

    test('should handle message sending failures', async () => {
      const sendSpy = jest.spyOn(manager.messageProtocol, 'sendToParent')
        .mockRejectedValue(new Error('Communication failed'));

      // Should not throw
      await expect(manager.notifyReady()).resolves.toBe(undefined);
      expect(sendSpy).toHaveBeenCalled();
    });

    test('should handle video control failures', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      manager.videoElement = {
        get muted() { throw new Error('Property access failed'); },
        set muted(value) { throw new Error('Property set failed'); }
      };

      // Should not throw and should log error
      expect(() => manager.setAudioState(true)).not.toThrow();
      expect(manager.hasAudio).toBe(true); // State should still update

      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources on destroy', () => {
      manager = createManager();
      manager.videoCheckInterval = setInterval(() => {}, 1000);

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const protocolDestroySpy = jest.spyOn(manager.messageProtocol, 'destroy');

      manager.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(protocolDestroySpy).toHaveBeenCalled();
      expect(manager.videoCheckInterval).toBeNull();
    });
  });
});