/**
 * QTV-004: Enhanced Audio Switching Logic Tests
 * Tests for improved audio management with persistence and validation
 */

// Mock browser API
global.browser = {
  runtime: {
    sendMessage: jest.fn().mockResolvedValue({ success: true })
  },
  tabs: {
    update: jest.fn().mockResolvedValue({}),
    query: jest.fn().mockResolvedValue([])
  }
};

// Mock message bus
const mockMessageBus = {
  subscribe: jest.fn(),
  publish: jest.fn()
};

// Set up global mocks
global.window = {
  QuadTVMessageBus: mockMessageBus,
  quadTVCurrentTabId: 123
};

// Mock DOM
global.document = {
  createElement: jest.fn((tag) => ({
    id: '',
    className: '',
    style: {},
    textContent: '',
    addEventListener: jest.fn(),
    remove: jest.fn()
  })),
  body: {
    appendChild: jest.fn(),
    style: {}
  },
  querySelector: jest.fn()
};

// Mock intervals
global.setInterval = jest.fn(() => 'mockIntervalId');
global.clearInterval = jest.fn();
global.setTimeout = jest.fn((fn, delay) => {
  if (delay === 200) {
    // For the flash timeout, return the function for manual execution
    return fn;
  }
  // For other timeouts, execute immediately
  return fn();
});

// Load UIManager
const { UIManager } = require('../../src/content/uiManager.js');

describe('QTV-004: Enhanced Audio Switching Logic', () => {
  let uiManager;
  let mockVideo;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock video element
    mockVideo = {
      muted: false,
      volume: 1.0,
      paused: false,
      play: jest.fn().mockResolvedValue(),
      pause: jest.fn()
    };

    document.querySelector.mockReturnValue(mockVideo);
    global.window.quadTVCurrentTabId = 123;

    uiManager = new UIManager();

    // Set up initial multi-tab state
    uiManager.onQuadTVActivated({
      streamTabs: [[0, 123], [1, 124], [2, 125], [3, 126]],
      activeAudioTab: 123
    });
  });

  describe('Enhanced Audio Control', () => {
    test('should enable audio with full volume control', () => {
      uiManager.setAudioState({
        hasAudio: true,
        streamIndex: 0
      });

      expect(mockVideo.muted).toBe(false);
      expect(mockVideo.volume).toBe(1.0);
      expect(uiManager.hasAudio).toBe(true);
      expect(uiManager.streamIndex).toBe(0);
    });

    test('should attempt to play paused video when enabling audio', () => {
      mockVideo.paused = true;

      uiManager.setAudioState({
        hasAudio: true,
        streamIndex: 0
      });

      expect(mockVideo.play).toHaveBeenCalled();
    });

    test('should setup audio monitoring when audio enabled', () => {
      uiManager.setAudioState({
        hasAudio: true,
        streamIndex: 0
      });

      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 500);
    });

    test('should clear audio monitoring when audio disabled', () => {
      // First enable audio to set up monitoring
      uiManager.setAudioState({
        hasAudio: true,
        streamIndex: 0
      });

      expect(setInterval).toHaveBeenCalled();

      // Then disable audio
      uiManager.setAudioState({
        hasAudio: false,
        streamIndex: 0
      });

      expect(clearInterval).toHaveBeenCalledWith('mockIntervalId');
    });

    test('should restore audio if YouTube TV mutes it', () => {
      uiManager.setAudioState({
        hasAudio: true,
        streamIndex: 0
      });

      // Simulate YouTube TV muting the video
      mockVideo.muted = true;

      // Trigger the monitoring interval
      const monitoringFn = setInterval.mock.calls[0][0];
      monitoringFn();

      expect(mockVideo.muted).toBe(false);
    });
  });

  describe('Visual Border Indicators', () => {
    test('should add red border when audio is active', () => {
      uiManager.setAudioState({
        hasAudio: true,
        streamIndex: 0
      });

      expect(document.body.style.border).toBe('4px solid #ff0000');
      expect(document.body.style.boxSizing).toBe('border-box');
    });

    test('should remove border when audio is inactive', () => {
      uiManager.setAudioState({
        hasAudio: false,
        streamIndex: 0
      });

      expect(document.body.style.border).toBe('none');
    });
  });

  describe('Audio State Persistence', () => {
    test('should preserve audio state during layout changes', () => {
      // Set audio state
      uiManager.setAudioState({
        hasAudio: true,
        streamIndex: 0
      });

      // Change layout
      uiManager.setLayout('1+3');

      expect(mockMessageBus.publish).toHaveBeenCalledWith('LAYOUT_CHANGED', {
        layout: '1+3',
        preserveAudio: {
          hasAudio: true,
          streamIndex: 0,
          activeAudioTab: 123
        }
      });
    });

    test('should validate audio state after layout change', () => {
      uiManager.setAudioState({
        hasAudio: true,
        streamIndex: 0
      });

      // Simulate lost audio state
      mockVideo.muted = true;

      // Trigger validation
      uiManager.validateAudioState();

      expect(mockVideo.muted).toBe(false);
      expect(mockVideo.volume).toBe(1.0);
    });
  });

  describe('Enhanced Click Handling', () => {
    test('should show visual feedback when clicking already active audio tab', () => {
      global.window.quadTVCurrentTabId = 123; // Active audio tab

      const indicatorMock = {
        style: { background: '#ff0000' }
      };
      uiManager.indicator = indicatorMock;

      uiManager.handleIndicatorClick();

      // Should show green flash
      expect(indicatorMock.style.background).toBe('#00ff00');

      // Should restore original color after timeout
      // Find the timeout call with delay 200
      const timeoutCall = setTimeout.mock.calls.find(call => call[1] === 200);
      expect(timeoutCall).toBeDefined();

      const timeoutFn = timeoutCall[0];
      timeoutFn();
      expect(indicatorMock.style.background).toBe('#ff0000');
    });

    test('should request audio switch for inactive tabs', () => {
      global.window.quadTVCurrentTabId = 124; // Inactive tab

      uiManager.handleIndicatorClick();

      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'SWITCH_AUDIO',
        streamIndex: 1
      });
    });
  });

  describe('Cleanup and Error Handling', () => {
    test('should clean up audio monitoring on deactivation', () => {
      // Set up audio monitoring
      uiManager.setAudioState({
        hasAudio: true,
        streamIndex: 0
      });

      expect(setInterval).toHaveBeenCalled();

      // Deactivate
      uiManager.deactivate();

      expect(clearInterval).toHaveBeenCalledWith('mockIntervalId');
      expect(document.body.style.border).toBe('none');
    });

    test('should handle missing video element gracefully', () => {
      document.querySelector.mockReturnValue(null);

      expect(() => {
        uiManager.setAudioState({
          hasAudio: true,
          streamIndex: 0
        });
      }).not.toThrow();
    });

    test('should handle video play errors gracefully', () => {
      mockVideo.play.mockRejectedValue(new Error('Play failed'));

      expect(() => {
        uiManager.enableAudio(mockVideo);
      }).not.toThrow();
    });
  });

  describe('QTV-004 Acceptance Criteria', () => {
    test('should ensure only one stream has audio active at a time', () => {
      // This is validated through the browser-level muting in background controller
      // Content script ensures local video state is correct
      uiManager.setAudioState({
        hasAudio: true,
        streamIndex: 0
      });

      expect(mockVideo.muted).toBe(false);
      expect(uiManager.hasAudio).toBe(true);

      // When audio switches away
      uiManager.setAudioState({
        hasAudio: false,
        streamIndex: 0
      });

      expect(mockVideo.muted).toBe(true);
      expect(uiManager.hasAudio).toBe(false);
    });

    test('should switch audio when clicking inactive stream', () => {
      global.window.quadTVCurrentTabId = 125; // Stream 2, inactive

      uiManager.handleIndicatorClick();

      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'SWITCH_AUDIO',
        streamIndex: 2
      });
    });

    test('should persist audio state during layout changes', () => {
      uiManager.setAudioState({
        hasAudio: true,
        streamIndex: 1
      });

      uiManager.setLayout('2-vertical');

      expect(mockMessageBus.publish).toHaveBeenCalledWith('LAYOUT_CHANGED',
        expect.objectContaining({
          layout: '2-vertical',
          preserveAudio: expect.objectContaining({
            hasAudio: true,
            streamIndex: 1
          })
        })
      );
    });
  });
});