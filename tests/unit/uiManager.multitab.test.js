/**
 * UIManager Multi-Tab Tests - QTV-002 & QTV-003
 * Tests for the multi-tab architecture implementation
 */

// Mock browser API
global.browser = {
  runtime: {
    sendMessage: jest.fn().mockResolvedValue({ success: true })
  }
};

// Mock message bus
const mockMessageBus = {
  subscribe: jest.fn(),
  publish: jest.fn()
};

// Mock layout engine
const mockLayoutEngine = {
  getLayout: jest.fn().mockReturnValue({
    streams: [
      { gridArea: '1 / 1 / 2 / 2' },
      { gridArea: '1 / 2 / 2 / 3' },
      { gridArea: '2 / 1 / 3 / 2' },
      { gridArea: '2 / 2 / 3 / 3' }
    ]
  }),
  generateCSS: jest.fn().mockReturnValue({
    container: {
      display: 'grid',
      gridTemplate: '1fr 1fr / 1fr 1fr',
      gap: '8px'
    },
    streams: [
      { gridArea: '1 / 1 / 2 / 2' },
      { gridArea: '1 / 2 / 2 / 3' },
      { gridArea: '2 / 1 / 3 / 2' },
      { gridArea: '2 / 2 / 3 / 3' }
    ]
  })
};

// Set up global mocks
global.window = {
  QuadTVMessageBus: mockMessageBus,
  QuadTVLayoutEngine: mockLayoutEngine,
  quadTVCurrentTabId: 123
};

// Mock DOM
global.document = {
  createElement: jest.fn((tag) => {
    const element = {
      id: '',
      className: '',
      style: {},
      dataset: {},
      textContent: '',
      addEventListener: jest.fn(),
      remove: jest.fn()
    };
    return element;
  }),
  body: {
    appendChild: jest.fn(),
    style: {}
  },
  querySelector: jest.fn()
};

// Load UIManager
const { UIManager } = require('../../src/content/uiManager.js');

describe('UIManager - Multi-Tab Architecture (QTV-002 & QTV-003)', () => {
  let uiManager;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset global state
    global.window.quadTVCurrentTabId = 123;

    // Create new instance
    uiManager = new UIManager();
  });

  afterEach(() => {
    // Clean up any running intervals and timeouts to prevent Jest open handles
    if (uiManager) {
      if (uiManager.clearAudioMonitoring) {
        uiManager.clearAudioMonitoring();
      }
      if (uiManager.clearAudioFlashTimeout) {
        uiManager.clearAudioFlashTimeout();
      }
      
      // Deactivate to ensure full cleanup
      if (uiManager.isActive) {
        uiManager.deactivate();
      }
    }
  });

  describe('QTV-002: Multi-Tab Coordination', () => {
    test('should initialize with multi-tab state management', () => {
      expect(uiManager.isActive).toBe(false);
      expect(uiManager.streamTabs).toBeInstanceOf(Map);
      expect(uiManager.activeAudioTab).toBe(null);
      expect(uiManager.isControlTab).toBe(false);
    });

    test('should handle QuadTV activation with tab mapping', () => {
      const activationData = {
        streamTabs: [[0, 123], [1, 124], [2, 125], [3, 126]],
        activeAudioTab: 123
      };

      uiManager.onQuadTVActivated(activationData);

      expect(uiManager.streamTabs.size).toBe(4);
      expect(uiManager.streamTabs.get(0)).toBe(123);
      expect(uiManager.streamTabs.get(1)).toBe(124);
      expect(uiManager.activeAudioTab).toBe(123);
      expect(uiManager.isActive).toBe(true);
    });

    test('should create visual indicator on activation', () => {
      const activationData = {
        streamTabs: [[0, 123], [1, 124], [2, 125], [3, 126]],
        activeAudioTab: 123
      };

      uiManager.onQuadTVActivated(activationData);

      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(uiManager.indicator).toBeDefined();
      expect(uiManager.indicator.id).toBe('quadtv-tab-indicator');
      expect(document.body.appendChild).toHaveBeenCalledWith(uiManager.indicator);
    });

    test('should remove indicator on deactivation', () => {
      // First activate
      uiManager.activate();
      const indicator = uiManager.indicator;
      expect(indicator).toBeDefined();

      // Then deactivate
      uiManager.deactivate();

      expect(indicator.remove).toHaveBeenCalled();
      expect(uiManager.indicator).toBe(null);
      expect(uiManager.isActive).toBe(false);
    });

    test('should determine correct stream index for current tab', () => {
      global.window.quadTVCurrentTabId = 125; // Stream 2

      const activationData = {
        streamTabs: [[0, 123], [1, 124], [2, 125], [3, 126]],
        activeAudioTab: 123
      };

      uiManager.onQuadTVActivated(activationData);
      uiManager.updateIndicatorText();

      expect(uiManager.indicator.textContent).toContain('Stream 2');
    });
  });

  describe('QTV-003: Audio Management', () => {
    beforeEach(() => {
      const activationData = {
        streamTabs: [[0, 123], [1, 124], [2, 125], [3, 126]],
        activeAudioTab: 123
      };
      uiManager.onQuadTVActivated(activationData);
    });

    test('should display correct audio state in indicator', () => {
      global.window.quadTVCurrentTabId = 123; // Active audio tab

      uiManager.updateIndicatorText();
      expect(uiManager.indicator.textContent).toContain('🔊 AUDIO');

      // Change to inactive tab
      global.window.quadTVCurrentTabId = 124;
      uiManager.updateIndicatorText();
      expect(uiManager.indicator.textContent).toContain('🔇 MUTED');
    });

    test('should handle audio state changes', () => {
      const mockVideo = {
        muted: false,
        paused: true,
        volume: 0.5,
        play: jest.fn().mockResolvedValue()
      };
      document.querySelector.mockReturnValue(mockVideo);

      // Test enabling audio
      uiManager.setAudioState({
        hasAudio: true,
        streamIndex: 0
      });

      expect(mockVideo.muted).toBe(false);
      expect(mockVideo.volume).toBe(1.0);
      expect(mockVideo.play).toHaveBeenCalled();

      // Test disabling audio
      uiManager.setAudioState({
        hasAudio: false,
        streamIndex: 0
      });

      expect(mockVideo.muted).toBe(true);
    });

    test('should handle audio changes from background script', () => {
      const audioChangeData = {
        activeAudioTab: 125,
        activeStreamIndex: 2
      };

      uiManager.onAudioChanged(audioChangeData);

      expect(uiManager.activeAudioTab).toBe(125);
    });

    test('should send audio switch request when indicator clicked', () => {
      global.window.quadTVCurrentTabId = 124; // Stream 1, not active

      uiManager.handleIndicatorClick();

      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'SWITCH_AUDIO',
        streamIndex: 1
      });
    });

    test('should not send switch request if already active audio tab', () => {
      global.window.quadTVCurrentTabId = 123; // Already active audio tab

      uiManager.handleIndicatorClick();

      expect(browser.runtime.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Message Bus Integration', () => {
    test('should subscribe to multi-tab coordination messages', () => {
      expect(mockMessageBus.subscribe).toHaveBeenCalledWith('QUADTV_ACTIVATED', expect.any(Function));
      expect(mockMessageBus.subscribe).toHaveBeenCalledWith('QUADTV_DEACTIVATED', expect.any(Function));
      expect(mockMessageBus.subscribe).toHaveBeenCalledWith('AUDIO_CHANGED', expect.any(Function));
      expect(mockMessageBus.subscribe).toHaveBeenCalledWith('SET_AUDIO_STATE', expect.any(Function));
    });

    test('should publish layout change events', () => {
      uiManager.setLayout('1+3');

      expect(mockMessageBus.publish).toHaveBeenCalledWith('LAYOUT_CHANGED', {
        layout: '1+3',
        preserveAudio: {
          hasAudio: undefined,
          streamIndex: undefined,
          activeAudioTab: null
        }
      });
    });

    test('should publish UI activation events', () => {
      uiManager.activate();

      expect(mockMessageBus.publish).toHaveBeenCalledWith('UI_ACTIVATED');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing video element gracefully', () => {
      document.querySelector.mockReturnValue(null);

      expect(() => {
        uiManager.setAudioState({
          hasAudio: true,
          streamIndex: 0
        });
      }).not.toThrow();
    });

    test('should handle browser API errors gracefully', () => {
      browser.runtime.sendMessage.mockRejectedValue(new Error('Connection error'));

      expect(() => {
        uiManager.handleIndicatorClick();
      }).not.toThrow();
    });

    test('should handle invalid stream tabs gracefully', () => {
      global.window.quadTVCurrentTabId = 999; // Non-existent tab

      const activationData = {
        streamTabs: [[0, 123], [1, 124]],
        activeAudioTab: 123
      };

      uiManager.onQuadTVActivated(activationData);
      uiManager.updateIndicatorText();

      // Should fall back to generic text
      expect(uiManager.indicator.textContent).toContain('QuadTV Active');
    });
  });

  describe('Multi-Tab Integration', () => {
    test('should handle complete activation/deactivation cycle', () => {
      expect(uiManager.isActive).toBe(false);

      // Activate
      const activationData = {
        streamTabs: [[0, 123], [1, 124], [2, 125], [3, 126]],
        activeAudioTab: 123
      };
      uiManager.onQuadTVActivated(activationData);
      expect(uiManager.isActive).toBe(true);
      expect(uiManager.streamTabs.size).toBe(4);

      // Deactivate
      uiManager.deactivate();
      expect(uiManager.isActive).toBe(false);
      expect(uiManager.indicator).toBe(null);
    });
  });
});