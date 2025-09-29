/**
 * QTV-025: PostMessage Infrastructure Tests
 */

// Mock window and postMessage
global.window = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  self: {},
  top: {},
  parent: {
    postMessage: jest.fn()
  },
  location: {
    origin: 'https://tv.youtube.com'
  }
};

const QuadTVMessageProtocol = require('../../src/shared/messageProtocol.js');

describe('QTV-025: PostMessage Infrastructure', () => {
  let protocol;

  beforeEach(() => {
    jest.clearAllMocks();
    protocol = new QuadTVMessageProtocol();
  });

  afterEach(() => {
    if (protocol) {
      protocol.destroy();
    }
  });

  describe('Message Creation', () => {
    test('should create message with correct structure', () => {
      const message = protocol.createMessage('TEST_TYPE', { data: 'test' });

      expect(message).toMatchObject({
        type: 'TEST_TYPE',
        payload: { data: 'test' },
        source: 'QuadTV'
      });
      expect(message.timestamp).toBeGreaterThan(0);
      expect(message.id).toBeNull();
    });

    test('should create message with ID when response required', () => {
      const message = protocol.createMessage('TEST_TYPE', {}, true);

      expect(message.id).toBeGreaterThan(0);
    });
  });

  describe('Message Types', () => {
    test('should have all required message types defined', () => {
      const requiredTypes = [
        'SET_AUDIO_STATE',
        'MUTE_AUDIO',
        'UNMUTE_AUDIO',
        'IFRAME_READY',
        'AUDIO_STATE_CHANGED',
        'USER_CLICKED_STREAM'
      ];

      requiredTypes.forEach(type => {
        expect(protocol.messageTypes[type]).toBe(type);
      });
    });
  });

  describe('Message Handlers', () => {
    test('should register and call message handlers', () => {
      const handler = jest.fn();
      protocol.onMessage('TEST_TYPE', handler);

      // Simulate incoming message
      const mockEvent = {
        origin: 'https://tv.youtube.com',
        data: {
          type: 'TEST_TYPE',
          source: 'QuadTV',
          payload: { test: 'data' }
        }
      };

      protocol.handleMessage(mockEvent);

      expect(handler).toHaveBeenCalledWith({ test: 'data' }, mockEvent.data);
    });

    test('should ignore messages from wrong origin', () => {
      const handler = jest.fn();
      protocol.onMessage('TEST_TYPE', handler);

      const mockEvent = {
        origin: 'https://malicious.com',
        data: {
          type: 'TEST_TYPE',
          source: 'QuadTV'
        }
      };

      protocol.handleMessage(mockEvent);

      expect(handler).not.toHaveBeenCalled();
    });

    test('should ignore messages without QuadTV source', () => {
      const handler = jest.fn();
      protocol.onMessage('TEST_TYPE', handler);

      const mockEvent = {
        origin: 'https://tv.youtube.com',
        data: {
          type: 'TEST_TYPE',
          source: 'Other'
        }
      };

      protocol.handleMessage(mockEvent);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Send to Parent', () => {
    beforeEach(() => {
      // Mock iframe context
      global.window.self = {};
      global.window.top = { different: 'object' };
    });

    test('should send message to parent successfully', async () => {
      const promise = protocol.sendToParent('TEST_TYPE', { data: 'test' });

      expect(window.parent.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TEST_TYPE',
          payload: { data: 'test' },
          source: 'QuadTV'
        }),
        '*'
      );

      await expect(promise).resolves.toBeUndefined();
    });

    test('should reject when not in iframe context', async () => {
      // Mock top-level window context
      global.window.self = global.window.top;

      await expect(
        protocol.sendToParent('TEST_TYPE')
      ).rejects.toThrow('Not in iframe context');
    });
  });

  describe('Send to Iframe', () => {
    test('should send message to iframe successfully', async () => {
      const mockIframe = {
        contentWindow: {
          postMessage: jest.fn()
        }
      };

      const promise = protocol.sendToIframe(mockIframe, 'TEST_TYPE', { data: 'test' });

      expect(mockIframe.contentWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TEST_TYPE',
          payload: { data: 'test' },
          source: 'QuadTV'
        }),
        'https://tv.youtube.com'
      );

      await expect(promise).resolves.toBeUndefined();
    });

    test('should reject with invalid iframe', async () => {
      await expect(
        protocol.sendToIframe(null, 'TEST_TYPE')
      ).rejects.toThrow('Invalid iframe reference');
    });
  });

  describe('Promise Resolution', () => {
    test('should resolve promise when response received', () => {
      const handler = jest.fn().mockReturnValue({ response: 'data' });
      protocol.onMessage('TEST_TYPE', handler);

      // Simulate request with ID
      const requestEvent = {
        origin: 'https://tv.youtube.com',
        data: {
          type: 'TEST_TYPE',
          source: 'QuadTV',
          id: 123,
          payload: { request: 'data' }
        }
      };

      protocol.handleMessage(requestEvent);

      // Should call handler and expect response
      expect(handler).toHaveBeenCalledWith({ request: 'data' }, requestEvent.data);
    });
  });

  describe('Audio Coordination Messages', () => {
    test('should handle SET_AUDIO_STATE message', () => {
      const handler = jest.fn();
      protocol.onMessage('SET_AUDIO_STATE', handler);

      const mockEvent = {
        origin: 'https://tv.youtube.com',
        data: {
          type: 'SET_AUDIO_STATE',
          source: 'QuadTV',
          payload: { streamIndex: 0, hasAudio: true }
        }
      };

      protocol.handleMessage(mockEvent);

      expect(handler).toHaveBeenCalledWith(
        { streamIndex: 0, hasAudio: true },
        mockEvent.data
      );
    });

    test('should handle AUDIO_STATE_CHANGED message', () => {
      const handler = jest.fn();
      protocol.onMessage('AUDIO_STATE_CHANGED', handler);

      const mockEvent = {
        origin: 'https://tv.youtube.com',
        data: {
          type: 'AUDIO_STATE_CHANGED',
          source: 'QuadTV',
          payload: { streamIndex: 1, hasAudio: false }
        }
      };

      protocol.handleMessage(mockEvent);

      expect(handler).toHaveBeenCalledWith(
        { streamIndex: 1, hasAudio: false },
        mockEvent.data
      );
    });
  });
});