// MessageBus test file

// Mock browser APIs
global.browser = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

// Import MessageBus for testing
const { MessageBus } = require('../../src/shared/messageBus.js');

describe('MessageBus', () => {
  let messageBus;

  beforeEach(() => {
    messageBus = new MessageBus();
  });

  test('should create instance with empty subscribers', () => {
    expect(messageBus.subscribers).toBeDefined();
    expect(messageBus.subscribers.size).toBe(0);
  });

  test('should subscribe to events', () => {
    const callback = jest.fn();
    messageBus.subscribe('TEST_EVENT', callback);

    expect(messageBus.subscribers.has('TEST_EVENT')).toBe(true);
    expect(messageBus.subscribers.get('TEST_EVENT')).toContain(callback);
  });

  test('should publish events to subscribers', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    const testData = { test: 'data' };

    messageBus.subscribe('TEST_EVENT', callback1);
    messageBus.subscribe('TEST_EVENT', callback2);
    messageBus.publish('TEST_EVENT', testData);

    expect(callback1).toHaveBeenCalledWith(testData);
    expect(callback2).toHaveBeenCalledWith(testData);
  });

  test('should unsubscribe from events', () => {
    const callback = jest.fn();
    messageBus.subscribe('TEST_EVENT', callback);
    messageBus.unsubscribe('TEST_EVENT', callback);

    messageBus.publish('TEST_EVENT', {});
    expect(callback).not.toHaveBeenCalled();
  });

  test('should handle errors in callbacks gracefully', () => {
    const errorCallback = jest.fn(() => {
      throw new Error('Test error');
    });
    const successCallback = jest.fn();

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    messageBus.subscribe('TEST_EVENT', errorCallback);
    messageBus.subscribe('TEST_EVENT', successCallback);
    messageBus.publish('TEST_EVENT', {});

    expect(errorCallback).toHaveBeenCalled();
    expect(successCallback).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test('should do nothing when publishing to non-existent event', () => {
    expect(() => {
      messageBus.publish('NON_EXISTENT_EVENT', {});
    }).not.toThrow();
  });
});