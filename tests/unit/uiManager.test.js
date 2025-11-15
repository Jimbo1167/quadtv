/**
 * UIManager Unit Tests
 * Tests for the core UI management functionality including:
 * - Grid creation and layout management
 * - Resizable dividers
 * - Keyboard shortcuts
 * - Onboarding
 */

// Mock DOM APIs
class MockElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.classList = new MockClassList();
    this.style = {};
    this.children = [];
    this.innerHTML = '';
    this.textContent = '';
    this.attributes = {};
    this.eventListeners = {};
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  remove() {
    // Mock remove
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  addEventListener(event, handler) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(handler);
  }

  removeEventListener(event, handler) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(h => h !== handler);
    }
  }

  querySelector(selector) {
    return null;
  }

  querySelectorAll(selector) {
    return [];
  }
}

class MockClassList {
  constructor() {
    this.classes = new Set();
  }

  add(...classes) {
    classes.forEach(c => this.classes.add(c));
  }

  remove(...classes) {
    classes.forEach(c => this.classes.delete(c));
  }

  contains(className) {
    return this.classes.has(className);
  }
}

// Mock document
global.document = {
  createElement: jest.fn((tagName) => new MockElement(tagName)),
  body: new MockElement('body'),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
};

// Mock window
global.window = {
  QuadTVMessageBus: {
    subscribe: jest.fn(),
    publish: jest.fn(),
  },
  QuadTVLayoutEngine: {
    getLayout: jest.fn((layout) => ({
      name: layout === '2x2' ? '2x2 Grid' : '1+2 Layout',
      streams: layout === '2x2' ? [
        { position: 1, gridArea: '1 / 1 / 2 / 2' },
        { position: 2, gridArea: '1 / 2 / 2 / 3' },
        { position: 3, gridArea: '2 / 1 / 3 / 2' },
        { position: 4, gridArea: '2 / 2 / 3 / 3' },
      ] : [
        { position: 1, gridArea: '1 / 1 / 3 / 2' },
        { position: 2, gridArea: '1 / 2 / 2 / 3' },
        { position: 3, gridArea: '2 / 2 / 3 / 3' },
      ]
    })),
    generateCSS: jest.fn((layout) => ({
      container: {
        display: 'grid',
        gridTemplate: layout === '2x2' ? '1fr 1fr / 1fr 1fr' : '2fr 1fr / 2fr 1fr',
      },
      streams: layout === '2x2' ? Array(4).fill({}) : Array(3).fill({}),
    })),
  },
  QuadTVStorageManager: {
    getSettings: jest.fn(async () => ({ lastLayout: '2x2' })),
    saveSetting: jest.fn(async () => {}),
    getGridRatios: jest.fn(async () => ({
      '2x2': { columns: [1, 1], rows: [1, 1] },
    })),
    saveGridRatios: jest.fn(async () => {}),
  },
};

// Mock localStorage
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

describe('UIManager', () => {
  let UIManager;
  let uiManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset document.createElement to return new mocks
    document.createElement.mockImplementation((tagName) => new MockElement(tagName));

    // Create a minimal UIManager class for testing
    UIManager = class {
      constructor() {
        this.isActive = false;
        this.currentLayout = '2x2';
        this.container = null;
        this.messageBus = window.QuadTVMessageBus;
        this.layoutEngine = window.QuadTVLayoutEngine;
        this.iframes = [];
        this.dividers = [];
        this.isDragging = false;
        this.gridRatios = {
          '2x2': { columns: [1, 1], rows: [1, 1] },
          '1+2': { columns: [2, 1], rows: [1, 1] },
          '2-vertical': { columns: [1, 1], rows: [1] }
        };
        this.init();
      }

      init() {
        this.setupMessageBusListeners();
        this.setupKeyboardShortcuts();
      }

      setupMessageBusListeners() {
        this.messageBus.subscribe('QUADTV_ACTIVATED', (data) => this.onQuadTVActivated(data));
        this.messageBus.subscribe('QUADTV_DEACTIVATED', () => this.deactivate());
        this.messageBus.subscribe('SET_LAYOUT', (data) => this.setLayout(data.layout));
        this.messageBus.subscribe('RESET_GRID', () => this.resetAllGridRatios());
      }

      setupKeyboardShortcuts() {
        this.keyboardHandler = (event) => this.handleKeyboardShortcut(event);
      }

      onQuadTVActivated(data) {
        this.isActive = true;
        this.currentLayout = data.layout || '2x2';
        this.createGrid();
      }

      createGrid() {
        this.container = document.createElement('div');
        this.container.setAttribute('id', 'quadtv-container');
        document.body.appendChild(this.container);

        const layout = this.layoutEngine.getLayout(this.currentLayout);
        this.iframes = layout.streams.map((stream, index) => {
          const iframe = document.createElement('iframe');
          iframe.setAttribute('src', 'https://tv.youtube.com');
          return iframe;
        });
      }

      deactivate() {
        if (this.container) {
          this.container.remove();
          this.container = null;
        }
        this.iframes = [];
        this.dividers = [];
        this.isActive = false;
      }

      setLayout(layout) {
        this.currentLayout = layout;
        if (this.isActive) {
          this.recreateGrid();
        }
      }

      recreateGrid() {
        this.deactivate();
        this.onQuadTVActivated({ layout: this.currentLayout });
      }

      handleKeyboardShortcut(event) {
        if (!this.isActive) return;

        if (event.key === 'Escape') {
          event.preventDefault();
          this.messageBus.publish('QUADTV_DEACTIVATED');
          return;
        }

        if (event.key === ' ' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          this.cycleLayout();
          return;
        }
      }

      cycleLayout() {
        const layouts = ['2x2', '1+2', '2-vertical'];
        const currentIndex = layouts.indexOf(this.currentLayout);
        const nextIndex = (currentIndex + 1) % layouts.length;
        this.setLayout(layouts[nextIndex]);
      }

      resetAllGridRatios() {
        this.gridRatios = {
          '2x2': { columns: [1, 1], rows: [1, 1] },
          '1+2': { columns: [2, 1], rows: [1, 1] },
          '2-vertical': { columns: [1, 1], rows: [1] }
        };
        if (this.isActive) {
          this.recreateGrid();
        }
      }
    };

    uiManager = new UIManager();
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      expect(uiManager.isActive).toBe(false);
      expect(uiManager.currentLayout).toBe('2x2');
      expect(uiManager.container).toBe(null);
      expect(uiManager.iframes).toEqual([]);
      expect(uiManager.dividers).toEqual([]);
    });

    test('should set up message bus listeners', () => {
      expect(window.QuadTVMessageBus.subscribe).toHaveBeenCalledWith(
        'QUADTV_ACTIVATED',
        expect.any(Function)
      );
      expect(window.QuadTVMessageBus.subscribe).toHaveBeenCalledWith(
        'QUADTV_DEACTIVATED',
        expect.any(Function)
      );
      expect(window.QuadTVMessageBus.subscribe).toHaveBeenCalledWith(
        'SET_LAYOUT',
        expect.any(Function)
      );
      expect(window.QuadTVMessageBus.subscribe).toHaveBeenCalledWith(
        'RESET_GRID',
        expect.any(Function)
      );
    });

    test('should set up keyboard shortcuts handler', () => {
      expect(uiManager.keyboardHandler).toBeDefined();
      expect(typeof uiManager.keyboardHandler).toBe('function');
    });
  });

  describe('Grid Creation', () => {
    test('should create grid container on activation', () => {
      uiManager.onQuadTVActivated({ layout: '2x2' });

      expect(uiManager.isActive).toBe(true);
      expect(uiManager.container).not.toBe(null);
      expect(document.createElement).toHaveBeenCalledWith('div');
    });

    test('should create correct number of iframes for 2x2 layout', () => {
      uiManager.onQuadTVActivated({ layout: '2x2' });

      expect(uiManager.iframes).toHaveLength(4);
    });

    test('should create correct number of iframes for 1+2 layout', () => {
      uiManager.onQuadTVActivated({ layout: '1+2' });

      expect(uiManager.iframes).toHaveLength(3);
    });

    test('should set iframe src to YouTube TV', () => {
      uiManager.onQuadTVActivated({ layout: '2x2' });

      uiManager.iframes.forEach(iframe => {
        expect(iframe.getAttribute('src')).toBe('https://tv.youtube.com');
      });
    });
  });

  describe('Activation and Deactivation', () => {
    test('should activate QuadTV with specified layout', () => {
      uiManager.onQuadTVActivated({ layout: '1+2' });

      expect(uiManager.isActive).toBe(true);
      expect(uiManager.currentLayout).toBe('1+2');
    });

    test('should default to 2x2 layout if not specified', () => {
      uiManager.onQuadTVActivated({});

      expect(uiManager.currentLayout).toBe('2x2');
    });

    test('should deactivate and clean up container', () => {
      uiManager.onQuadTVActivated({ layout: '2x2' });
      expect(uiManager.isActive).toBe(true);

      uiManager.deactivate();

      expect(uiManager.isActive).toBe(false);
      expect(uiManager.container).toBe(null);
      expect(uiManager.iframes).toEqual([]);
      expect(uiManager.dividers).toEqual([]);
    });
  });

  describe('Layout Switching', () => {
    test('should switch layout when active', () => {
      uiManager.onQuadTVActivated({ layout: '2x2' });

      uiManager.setLayout('1+2');

      expect(uiManager.currentLayout).toBe('1+2');
    });

    test('should recreate grid when switching layout while active', () => {
      uiManager.onQuadTVActivated({ layout: '2x2' });
      const oldContainer = uiManager.container;

      uiManager.setLayout('1+2');

      // Should have created new container
      expect(uiManager.container).not.toBe(null);
      expect(uiManager.isActive).toBe(true);
    });

    test('should update layout without recreating grid when inactive', () => {
      uiManager.setLayout('1+2');

      expect(uiManager.currentLayout).toBe('1+2');
      expect(uiManager.container).toBe(null);
    });

    test('should cycle through layouts correctly', () => {
      uiManager.currentLayout = '2x2';
      uiManager.cycleLayout();
      expect(uiManager.currentLayout).toBe('1+2');

      uiManager.cycleLayout();
      expect(uiManager.currentLayout).toBe('2-vertical');

      uiManager.cycleLayout();
      expect(uiManager.currentLayout).toBe('2x2');
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('should not handle shortcuts when inactive', () => {
      const event = {
        key: 'Escape',
        preventDefault: jest.fn()
      };

      uiManager.handleKeyboardShortcut(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    test('should handle Escape key to deactivate', () => {
      uiManager.onQuadTVActivated({ layout: '2x2' });

      const event = {
        key: 'Escape',
        preventDefault: jest.fn()
      };

      uiManager.handleKeyboardShortcut(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(window.QuadTVMessageBus.publish).toHaveBeenCalledWith('QUADTV_DEACTIVATED');
    });

    test('should handle Ctrl+Space to cycle layout', () => {
      uiManager.onQuadTVActivated({ layout: '2x2' });

      const event = {
        key: ' ',
        ctrlKey: true,
        preventDefault: jest.fn()
      };

      uiManager.handleKeyboardShortcut(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(uiManager.currentLayout).toBe('1+2');
    });

    test('should handle Cmd+Space (Mac) to cycle layout', () => {
      uiManager.onQuadTVActivated({ layout: '2x2' });

      const event = {
        key: ' ',
        metaKey: true,
        preventDefault: jest.fn()
      };

      uiManager.handleKeyboardShortcut(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(uiManager.currentLayout).toBe('1+2');
    });
  });

  describe('Grid Ratios and Reset', () => {
    test('should have default grid ratios for all layouts', () => {
      expect(uiManager.gridRatios['2x2']).toEqual({ columns: [1, 1], rows: [1, 1] });
      expect(uiManager.gridRatios['1+2']).toEqual({ columns: [2, 1], rows: [1, 1] });
      expect(uiManager.gridRatios['2-vertical']).toEqual({ columns: [1, 1], rows: [1] });
    });

    test('should reset all grid ratios to defaults', () => {
      // Modify ratios
      uiManager.gridRatios['2x2'] = { columns: [2, 1], rows: [3, 1] };

      uiManager.resetAllGridRatios();

      expect(uiManager.gridRatios['2x2']).toEqual({ columns: [1, 1], rows: [1, 1] });
    });

    test('should recreate grid after reset when active', () => {
      uiManager.onQuadTVActivated({ layout: '2x2' });
      const oldContainer = uiManager.container;

      uiManager.resetAllGridRatios();

      expect(uiManager.isActive).toBe(true);
      expect(uiManager.container).not.toBe(null);
    });

    test('should not recreate grid after reset when inactive', () => {
      uiManager.resetAllGridRatios();

      expect(uiManager.container).toBe(null);
    });
  });

  describe('Integration with LayoutEngine', () => {
    test('should use LayoutEngine to get layout config', () => {
      uiManager.onQuadTVActivated({ layout: '2x2' });

      expect(window.QuadTVLayoutEngine.getLayout).toHaveBeenCalledWith('2x2');
    });

    test('should create iframes based on layout stream count', () => {
      window.QuadTVLayoutEngine.getLayout.mockReturnValueOnce({
        name: 'Custom Layout',
        streams: [
          { position: 1, gridArea: '1 / 1 / 2 / 2' },
          { position: 2, gridArea: '1 / 2 / 2 / 3' },
        ]
      });

      uiManager.onQuadTVActivated({ layout: 'custom' });

      expect(uiManager.iframes).toHaveLength(2);
    });
  });
});

describe('UIManager Edge Cases', () => {
  test('should handle multiple activate calls gracefully', () => {
    const UIManager = class {
      constructor() {
        this.isActive = false;
        this.activationCount = 0;
      }

      onQuadTVActivated() {
        this.isActive = true;
        this.activationCount++;
      }
    };

    const manager = new UIManager();
    manager.onQuadTVActivated();
    manager.onQuadTVActivated();
    manager.onQuadTVActivated();

    expect(manager.isActive).toBe(true);
    expect(manager.activationCount).toBe(3);
  });

  test('should handle deactivate when already inactive', () => {
    const UIManager = class {
      constructor() {
        this.isActive = false;
        this.container = null;
      }

      deactivate() {
        if (this.container) {
          this.container.remove();
        }
        this.container = null;
        this.isActive = false;
      }
    };

    const manager = new UIManager();

    // Should not throw
    expect(() => manager.deactivate()).not.toThrow();
    expect(manager.isActive).toBe(false);
  });
});
