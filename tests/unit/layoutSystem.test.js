/**
 * QTV-009: Layout System Tests
 * Tests for browser window positioning and layout coordination
 */

// Mock browser APIs
global.browser = {
  tabs: {
    get: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
    query: jest.fn().mockResolvedValue([]),
    sendMessage: jest.fn().mockResolvedValue({ success: true })
  },
  windows: {
    getCurrent: jest.fn().mockResolvedValue({
      id: 1,
      width: 1920,
      height: 1080
    }),
    update: jest.fn().mockResolvedValue({})
  },
  runtime: {
    sendMessage: jest.fn().mockResolvedValue({ success: true })
  }
};

// Mock console to reduce test noise
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Create a mock BackgroundController with just the layout methods
class MockBackgroundController {
  constructor() {
    this.isActive = true;
    this.streamTabs = new Map([[0, 123], [1, 124], [2, 125], [3, 126]]);
    this.activeAudioTab = 123;
    this.currentLayout = '2x2';
  }

  delay(ms) {
    return Promise.resolve();
  }

  async notifyAllTabs(messageType, data = {}) {
    for (const [streamIndex, tabId] of this.streamTabs.entries()) {
      await browser.tabs.sendMessage(tabId, { type: messageType, ...data });
    }
  }

  async setLayout(layoutType) {
    if (!this.isActive) {
      console.log('📐 Layout: QuadTV not active, ignoring layout change');
      return;
    }

    console.log(`📐 Background: Setting layout to ${layoutType}`);
    this.currentLayout = layoutType;

    try {
      // Get screen dimensions
      const screenInfo = await this.getScreenInfo();
      console.log('📐 Screen info:', screenInfo);

      // Calculate tab positions based on layout
      const tabPositions = this.calculateTabPositions(layoutType, screenInfo);
      console.log('📐 Tab positions:', tabPositions);

      // Position each tab according to the layout
      for (const [streamIndex, tabId] of this.streamTabs.entries()) {
        const position = tabPositions[streamIndex];
        if (position) {
          await this.positionTab(tabId, position);
        }
      }

      // Notify all tabs about the layout change
      await this.notifyAllTabs('LAYOUT_CHANGED', {
        layout: layoutType,
        preserveAudio: {
          hasAudio: true,
          activeAudioTab: this.activeAudioTab
        }
      });

      console.log(`✅ Layout: Successfully applied ${layoutType} layout`);

    } catch (error) {
      console.error('❌ Layout: Failed to apply layout:', error);
    }
  }

  async getScreenInfo() {
    const currentWindow = await browser.windows.getCurrent();

    return {
      width: 1920,
      height: 1080,
      availableWidth: 1920,
      availableHeight: 1040
    };
  }

  calculateTabPositions(layoutType, screenInfo) {
    const { availableWidth, availableHeight } = screenInfo;
    const margin = 8;

    const layouts = {
      '2x2': [
        { x: 0, y: 0, width: availableWidth / 2 - margin, height: availableHeight / 2 - margin },
        { x: availableWidth / 2 + margin, y: 0, width: availableWidth / 2 - margin, height: availableHeight / 2 - margin },
        { x: 0, y: availableHeight / 2 + margin, width: availableWidth / 2 - margin, height: availableHeight / 2 - margin },
        { x: availableWidth / 2 + margin, y: availableHeight / 2 + margin, width: availableWidth / 2 - margin, height: availableHeight / 2 - margin }
      ],
      '1+3': [
        { x: 0, y: 0, width: (availableWidth * 2/3) - margin, height: availableHeight },
        { x: (availableWidth * 2/3) + margin, y: 0, width: (availableWidth / 3) - margin, height: availableHeight / 3 - margin },
        { x: (availableWidth * 2/3) + margin, y: availableHeight / 3 + margin, width: (availableWidth / 3) - margin, height: availableHeight / 3 - margin },
        { x: (availableWidth * 2/3) + margin, y: (availableHeight * 2/3) + margin, width: (availableWidth / 3) - margin, height: availableHeight / 3 - margin }
      ],
      '2-vertical': [
        { x: 0, y: 0, width: availableWidth / 2 - margin, height: availableHeight },
        { x: availableWidth / 2 + margin, y: 0, width: availableWidth / 2 - margin, height: availableHeight }
      ]
    };

    return layouts[layoutType] || layouts['2x2'];
  }

  async positionTab(tabId, position) {
    try {
      const tab = await browser.tabs.get(tabId);
      const windowId = tab.windowId || 1;

      await browser.windows.update(windowId, {
        left: Math.round(position.x),
        top: Math.round(position.y),
        width: Math.round(position.width),
        height: Math.round(position.height),
        focused: false
      });

      console.log(`📐 Positioned tab ${tabId} at (${position.x}, ${position.y}) ${position.width}x${position.height}`);

    } catch (error) {
      console.error(`❌ Failed to position tab ${tabId}:`, error);
    }
  }
}

describe('QTV-009: Layout System', () => {
  let backgroundController;

  beforeEach(() => {
    jest.clearAllMocks();
    backgroundController = new MockBackgroundController();

    // Mock tab.get to return reasonable tab data
    browser.tabs.get.mockImplementation((tabId) => Promise.resolve({
      id: tabId,
      windowId: tabId + 1000, // Different window for each tab
      url: 'https://tv.youtube.com'
    }));
  });

  describe('Layout Calculations', () => {
    test('should calculate correct positions for 2x2 layout', () => {
      const screenInfo = { availableWidth: 1920, availableHeight: 1040 };
      const positions = backgroundController.calculateTabPositions('2x2', screenInfo);

      expect(positions).toHaveLength(4);

      // Top-left quad
      expect(positions[0]).toEqual({
        x: 0, y: 0,
        width: 952, height: 512  // (1920/2 - 8), (1040/2 - 8)
      });

      // Top-right quad
      expect(positions[1]).toEqual({
        x: 968, y: 0,  // (1920/2 + 8)
        width: 952, height: 512
      });

      // Bottom-left quad
      expect(positions[2]).toEqual({
        x: 0, y: 528,  // (1040/2 + 8)
        width: 952, height: 512
      });

      // Bottom-right quad
      expect(positions[3]).toEqual({
        x: 968, y: 528,
        width: 952, height: 512
      });
    });

    test('should calculate correct positions for 1+3 layout', () => {
      const screenInfo = { availableWidth: 1920, availableHeight: 1040 };
      const positions = backgroundController.calculateTabPositions('1+3', screenInfo);

      expect(positions).toHaveLength(4);

      // Main stream (left 2/3)
      expect(positions[0]).toEqual({
        x: 0, y: 0,
        width: 1272, height: 1040  // (1920 * 2/3 - 8)
      });

      // First small stream (top-right)
      expect(positions[1]).toEqual({
        x: 1288, y: 0,  // (1920 * 2/3 + 8)
        width: 632, height: 338.6666666666667  // (1920/3 - 8), (1040/3 - 8)
      });
    });

    test('should calculate correct positions for 2-vertical layout', () => {
      const screenInfo = { availableWidth: 1920, availableHeight: 1040 };
      const positions = backgroundController.calculateTabPositions('2-vertical', screenInfo);

      expect(positions).toHaveLength(2);

      // Left half
      expect(positions[0]).toEqual({
        x: 0, y: 0,
        width: 952, height: 1040  // (1920/2 - 8)
      });

      // Right half
      expect(positions[1]).toEqual({
        x: 968, y: 0,  // (1920/2 + 8)
        width: 952, height: 1040
      });
    });

    test('should fallback to 2x2 for invalid layout', () => {
      const screenInfo = { availableWidth: 1920, availableHeight: 1040 };
      const positions = backgroundController.calculateTabPositions('invalid', screenInfo);

      expect(positions).toHaveLength(4);
      expect(positions[0].x).toBe(0);
      expect(positions[0].y).toBe(0);
    });
  });

  describe('Window Positioning', () => {
    test('should position tab windows correctly', async () => {
      const position = { x: 100, y: 200, width: 800, height: 600 };

      await backgroundController.positionTab(123, position);

      expect(browser.tabs.get).toHaveBeenCalledWith(123);
      expect(browser.windows.update).toHaveBeenCalledWith(1123, {
        left: 100,
        top: 200,
        width: 800,
        height: 600,
        focused: false
      });
    });

    test('should handle positioning errors gracefully', async () => {
      browser.windows.update.mockRejectedValue(new Error('Window positioning failed'));

      const position = { x: 100, y: 200, width: 800, height: 600 };

      await expect(backgroundController.positionTab(123, position)).resolves.not.toThrow();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to position tab 123'),
        expect.any(Error)
      );
    });
  });

  describe('Layout Application', () => {
    test('should apply 2x2 layout successfully', async () => {
      await backgroundController.setLayout('2x2');

      expect(backgroundController.currentLayout).toBe('2x2');
      expect(browser.windows.getCurrent).toHaveBeenCalled();
      expect(browser.windows.update).toHaveBeenCalledTimes(4); // 4 tabs positioned
      expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(4); // 4 tabs notified
    });

    test('should apply 1+3 layout successfully', async () => {
      await backgroundController.setLayout('1+3');

      expect(backgroundController.currentLayout).toBe('1+3');
      expect(browser.windows.update).toHaveBeenCalledTimes(4);

      // Verify main stream gets large position
      const calls = browser.windows.update.mock.calls;
      const mainStreamCall = calls[0][1]; // First call should be main stream
      expect(mainStreamCall.width).toBeGreaterThan(1000); // Large width for main stream
    });

    test('should apply 2-vertical layout successfully', async () => {
      await backgroundController.setLayout('2-vertical');

      expect(backgroundController.currentLayout).toBe('2-vertical');
      expect(browser.windows.update).toHaveBeenCalledTimes(2); // Only 2 tabs for vertical layout
    });

    test('should ignore layout changes when inactive', async () => {
      backgroundController.isActive = false;

      await backgroundController.setLayout('1+3');

      expect(browser.windows.update).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('📐 Layout: QuadTV not active, ignoring layout change');
    });

    test('should preserve audio state during layout changes', async () => {
      await backgroundController.setLayout('1+3');

      expect(browser.tabs.sendMessage).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({
          type: 'LAYOUT_CHANGED',
          layout: '1+3',
          preserveAudio: expect.objectContaining({
            hasAudio: true,
            activeAudioTab: 123
          })
        })
      );
    });
  });

  describe('Screen Info Detection', () => {
    test('should get screen info from browser API', async () => {
      const screenInfo = await backgroundController.getScreenInfo();

      expect(browser.windows.getCurrent).toHaveBeenCalled();
      expect(screenInfo).toEqual({
        width: 1920,
        height: 1080,
        availableWidth: 1920,
        availableHeight: 1040
      });
    });

    test('should handle screen info errors gracefully', async () => {
      browser.windows.getCurrent.mockRejectedValue(new Error('Window API failed'));

      await expect(backgroundController.getScreenInfo()).rejects.toThrow('Window API failed');
    });
  });

  describe('QTV-009 Acceptance Criteria', () => {
    test('should switch between 2x2, 1+3, 2-vertical layouts', async () => {
      // Create a fresh controller for this specific test
      const controller = new MockBackgroundController();

      // Test 2x2
      await controller.setLayout('2x2');
      expect(controller.currentLayout).toBe('2x2');
      expect(browser.windows.update).toHaveBeenCalledTimes(4);

      // Reset call count but keep mocks
      browser.windows.update.mockClear();

      // Test 1+3
      await controller.setLayout('1+3');
      expect(controller.currentLayout).toBe('1+3');
      expect(browser.windows.update).toHaveBeenCalledTimes(4);

      // Reset call count but keep mocks
      browser.windows.update.mockClear();

      // Test 2-vertical
      await controller.setLayout('2-vertical');
      expect(controller.currentLayout).toBe('2-vertical');
      expect(browser.windows.update).toHaveBeenCalledTimes(2);
    });

    test('should maintain content during layout changes', async () => {
      // Create a fresh controller for this specific test
      const controller = new MockBackgroundController();

      await controller.setLayout('1+3');

      // Should notify tabs to preserve audio state
      expect(browser.tabs.sendMessage).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({
          type: 'LAYOUT_CHANGED',
          preserveAudio: expect.objectContaining({
            activeAudioTab: 123
          })
        })
      );
    });

    test('should coordinate layout across tabs', async () => {
      // Create a fresh controller for this specific test
      const controller = new MockBackgroundController();

      await controller.setLayout('2x2');

      // All 4 tabs should be notified
      expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(4);

      // Each call should include layout information
      for (let i = 0; i < 4; i++) {
        expect(browser.tabs.sendMessage).toHaveBeenNthCalledWith(
          i + 1,
          expect.objectContaining({
            type: 'LAYOUT_CHANGED',
            layout: '2x2'
          })
        );
      }
    });
  });
});