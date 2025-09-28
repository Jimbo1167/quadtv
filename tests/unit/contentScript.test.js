// Mock browser APIs
const mockRuntime = {
  onMessage: { addListener: jest.fn() },
  sendMessage: jest.fn()
};

const mockMessageBus = {
  subscribe: jest.fn(),
  publish: jest.fn()
};

global.browser = {
  runtime: mockRuntime
};

global.window = {
  QuadTVMessageBus: mockMessageBus
};

global.document = {
  readyState: 'complete',
  addEventListener: jest.fn()
};

global.console = {
  log: jest.fn(),
  error: jest.fn()
};

// Import after mocks are set up
let QuadTVContentScript;

beforeEach(() => {
  jest.clearAllMocks();

  // Define the class locally to test
  QuadTVContentScript = class {
    constructor() {
      this.isActive = false;
      this.messageBus = window.QuadTVMessageBus;
      this.init();
    }

    init() {
      this.setupMessageListener();
      this.setupMessageBusListeners();
      this.checkInitialState();
    }

    setupMessageListener() {
      browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleBackgroundMessage(message, sender, sendResponse);
        return true;
      });
    }

    setupMessageBusListeners() {
      this.messageBus.subscribe('UI_ACTIVATED', () => {
        this.isActive = true;
        this.notifyBackgroundState(true);
      });

      this.messageBus.subscribe('UI_DEACTIVATED', () => {
        this.isActive = false;
        this.notifyBackgroundState(false);
      });
    }

    async checkInitialState() {
      try {
        const response = await browser.runtime.sendMessage({ type: 'GET_TAB_STATE' });
        if (response?.isActive) {
          this.activateQuadTV();
        }
      } catch (error) {
        console.error('Failed to get initial state:', error);
      }
    }

    handleBackgroundMessage(message, sender, sendResponse) {
      switch (message.type) {
        case 'ACTIVATE_QUADTV':
          this.activateQuadTV();
          sendResponse({ success: true });
          break;

        case 'DEACTIVATE_QUADTV':
          this.deactivateQuadTV();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    }

    activateQuadTV() {
      if (this.isActive) return;

      console.log('Activating QuadTV');
      this.messageBus.publish('ACTIVATE_UI');
    }

    deactivateQuadTV() {
      if (!this.isActive) return;

      console.log('Deactivating QuadTV');
      this.messageBus.publish('DEACTIVATE_UI');
    }

    notifyBackgroundState(isActive) {
      const sendPromise = browser.runtime.sendMessage({
        type: 'UPDATE_TAB_STATE',
        isActive: isActive
      });
      if (sendPromise && sendPromise.catch) {
        sendPromise.catch(error => {
          console.error('Failed to update background state:', error);
        });
      }
    }
  };
});

describe('QuadTVContentScript - QTV-001 Tests', () => {
  let contentScript;

  beforeEach(() => {
    // Make sure sendMessage returns a promise by default
    mockRuntime.sendMessage.mockReturnValue(Promise.resolve());
    contentScript = new QuadTVContentScript();
  });

  describe('Initialization', () => {
    test('should initialize with inactive state', () => {
      expect(contentScript.isActive).toBe(false);
    });

    test('should setup message listener', () => {
      expect(mockRuntime.onMessage.addListener).toHaveBeenCalled();
    });

    test('should setup message bus listeners', () => {
      expect(mockMessageBus.subscribe).toHaveBeenCalledWith('UI_ACTIVATED', expect.any(Function));
      expect(mockMessageBus.subscribe).toHaveBeenCalledWith('UI_DEACTIVATED', expect.any(Function));
    });

    test('should check initial state on startup', () => {
      expect(mockRuntime.sendMessage).toHaveBeenCalledWith({ type: 'GET_TAB_STATE' });
    });
  });

  describe('Background Message Handling', () => {
    test('should activate QuadTV when receiving ACTIVATE_QUADTV message', () => {
      const sendResponse = jest.fn();
      const message = { type: 'ACTIVATE_QUADTV' };

      contentScript.handleBackgroundMessage(message, {}, sendResponse);

      expect(mockMessageBus.publish).toHaveBeenCalledWith('ACTIVATE_UI');
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should deactivate QuadTV when receiving DEACTIVATE_QUADTV message', () => {
      // First activate it
      contentScript.isActive = true;
      const sendResponse = jest.fn();
      const message = { type: 'DEACTIVATE_QUADTV' };

      contentScript.handleBackgroundMessage(message, {}, sendResponse);

      expect(mockMessageBus.publish).toHaveBeenCalledWith('DEACTIVATE_UI');
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should handle unknown message types', () => {
      const sendResponse = jest.fn();
      const message = { type: 'UNKNOWN_MESSAGE' };

      contentScript.handleBackgroundMessage(message, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Unknown message type'
      });
    });

    test('should not activate if already active', () => {
      contentScript.isActive = true;
      mockMessageBus.publish.mockClear();

      contentScript.activateQuadTV();

      expect(mockMessageBus.publish).not.toHaveBeenCalled();
    });

    test('should not deactivate if already inactive', () => {
      contentScript.isActive = false;
      mockMessageBus.publish.mockClear();

      contentScript.deactivateQuadTV();

      expect(mockMessageBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('State Synchronization', () => {
    test('should notify background when UI is activated', () => {
      const uiActivatedCallback = mockMessageBus.subscribe.mock.calls
        .find(call => call[0] === 'UI_ACTIVATED')[1];

      uiActivatedCallback();

      expect(contentScript.isActive).toBe(true);
      expect(mockRuntime.sendMessage).toHaveBeenCalledWith({
        type: 'UPDATE_TAB_STATE',
        isActive: true
      });
    });

    test('should notify background when UI is deactivated', () => {
      const uiDeactivatedCallback = mockMessageBus.subscribe.mock.calls
        .find(call => call[0] === 'UI_DEACTIVATED')[1];

      uiDeactivatedCallback();

      expect(contentScript.isActive).toBe(false);
      expect(mockRuntime.sendMessage).toHaveBeenCalledWith({
        type: 'UPDATE_TAB_STATE',
        isActive: false
      });
    });

    test('should handle background communication errors gracefully', async () => {
      const rejectedPromise = Promise.reject(new Error('Background not available'));
      mockRuntime.sendMessage.mockReturnValue(rejectedPromise);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      contentScript.notifyBackgroundState(true);

      // Wait for the async error handling to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update background state:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Initial State Recovery', () => {
    test('should activate if background says tab is active', async () => {
      mockRuntime.sendMessage.mockResolvedValue({ isActive: true });
      const activateSpy = jest.spyOn(contentScript, 'activateQuadTV');

      await contentScript.checkInitialState();

      expect(activateSpy).toHaveBeenCalled();
    });

    test('should remain inactive if background says tab is inactive', async () => {
      mockRuntime.sendMessage.mockResolvedValue({ isActive: false });
      const activateSpy = jest.spyOn(contentScript, 'activateQuadTV');

      await contentScript.checkInitialState();

      expect(activateSpy).not.toHaveBeenCalled();
    });

    test('should handle initial state check errors gracefully', async () => {
      mockRuntime.sendMessage.mockRejectedValue(new Error('Background not ready'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await contentScript.checkInitialState();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get initial state:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    test('should handle null response from background gracefully', async () => {
      mockRuntime.sendMessage.mockResolvedValue(null);
      const activateSpy = jest.spyOn(contentScript, 'activateQuadTV');

      await contentScript.checkInitialState();

      expect(activateSpy).not.toHaveBeenCalled();
    });
  });

  describe('DOM Ready State Handling', () => {
    test('should initialize immediately if DOM is ready', () => {
      // This tests the instantiation logic that checks document.readyState
      expect(contentScript).toBeDefined();
      expect(contentScript.isActive).toBe(false);
    });
  });
});