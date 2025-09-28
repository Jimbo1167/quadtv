// Test setup file
import { jest } from '@jest/globals';

// Mock browser APIs for all tests
global.browser = {
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

// Mock DOM APIs
global.document = {
  createElement: jest.fn(() => ({
    style: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn(),
      contains: jest.fn()
    },
    addEventListener: jest.fn(),
    appendChild: jest.fn(),
    remove: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => [])
  })),
  body: {
    appendChild: jest.fn()
  },
  readyState: 'complete',
  addEventListener: jest.fn()
};

global.window = {
  location: {
    href: 'https://tv.youtube.com/'
  }
};

// Suppress console.log in tests unless explicitly needed
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};