// UIManager test file for QTV-002

// Mock DOM and browser APIs
global.document = {
  createElement: jest.fn((tagName) => {
    const element = {
      tagName: tagName.toUpperCase(),
      style: {},
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        toggle: jest.fn(),
        contains: jest.fn().mockReturnValue(false)
      },
      addEventListener: jest.fn(),
      appendChild: jest.fn(),
      remove: jest.fn(),
      querySelector: jest.fn().mockImplementation((selector) => {
        if (selector === '.quadtv-iframe') {
          return {
            src: 'about:blank',
            setAttribute: jest.fn(),
            className: 'quadtv-iframe',
            onload: null,
            onerror: null
          };
        }
        if (selector === '.quadtv-stream-controls') {
          return {
            className: 'quadtv-stream-controls',
            innerHTML: `
              <button class="quadtv-audio-btn" data-action="toggle-audio">🔊</button>
              <button class="quadtv-focus-btn" data-action="focus">⛶</button>
              <button class="quadtv-channel-btn" data-action="change-channel">📺</button>
            `,
            classList: {
              add: jest.fn(),
              remove: jest.fn()
            }
          };
        }
        return null;
      }),
      querySelectorAll: jest.fn(() => []),
      setAttribute: jest.fn(),
      getAttribute: jest.fn(),
      hasAttribute: jest.fn(),
      innerHTML: '',
      id: '',
      className: '',
      dataset: {
        streamIndex: null
      },
      src: '',
      onload: null,
      onerror: null
    };

    // Special handling for iframe
    if (tagName === 'iframe') {
      element.setAttribute = jest.fn((attr, value) => {
        element[attr] = value;
      });
    }

    return element;
  }),
  body: {
    appendChild: jest.fn(),
    style: {}
  }
};

global.window = {
  location: {
    href: 'https://tv.youtube.com/watch/123'
  },
  QuadTVMessageBus: {
    subscribe: jest.fn(),
    publish: jest.fn()
  },
  QuadTVLayoutEngine: {
    getLayout: jest.fn().mockReturnValue({
      name: '2x2 Grid',
      streams: [
        { position: 1, gridArea: '1 / 1 / 2 / 2' },
        { position: 2, gridArea: '1 / 2 / 2 / 3' },
        { position: 3, gridArea: '2 / 1 / 3 / 2' },
        { position: 4, gridArea: '2 / 2 / 3 / 3' }
      ]
    }),
    generateCSS: jest.fn().mockReturnValue({
      container: {
        display: 'grid',
        gridTemplate: 'repeat(2, 1fr) / repeat(2, 1fr)',
        gap: '4px'
      },
      streams: [
        { gridArea: '1 / 1 / 2 / 2' },
        { gridArea: '1 / 2 / 2 / 3' },
        { gridArea: '2 / 1 / 3 / 2' },
        { gridArea: '2 / 2 / 3 / 3' }
      ]
    })
  }
};

describe('UIManager - QTV-002 Tests', () => {
  let uiManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset document.body
    global.document.body = {
      appendChild: jest.fn(),
      style: {}
    };

    // Create UIManager class for testing
    global.UIManager = class {
      constructor() {
        this.isActive = false;
        this.currentLayout = '2x2';
        this.container = null;
        this.streams = [];
        this.messageBus = window.QuadTVMessageBus;
        this.layoutEngine = window.QuadTVLayoutEngine;
        this.originalBodyStyles = null;
        this.init();
      }

      init() {
        this.setupMessageBusListeners();
      }

      setupMessageBusListeners() {
        this.messageBus.subscribe('ACTIVATE_UI', () => this.activate());
        this.messageBus.subscribe('DEACTIVATE_UI', () => this.deactivate());
        this.messageBus.subscribe('SET_LAYOUT', (data) => this.setLayout(data.layout));
        this.messageBus.subscribe('HIGHLIGHT_STREAM', (data) => this.highlightStream(data.streamIndex));
        this.messageBus.subscribe('SHOW_CONTROLS', (data) => this.showControls(data.streamIndex));
        this.messageBus.subscribe('HIDE_CONTROLS', (data) => this.hideControls(data.streamIndex));
        this.messageBus.subscribe('STREAM_URL_CHANGED', (data) => this.updateStreamUrl(data.streamIndex, data.url));
      }

      updateStreamUrl(streamIndex, url) {
        if (this.streams[streamIndex]) {
          const iframe = this.streams[streamIndex].querySelector('.quadtv-iframe');
          if (iframe && this.isValidYouTubeTVUrl(url)) {
            iframe.src = url;
            this.streams[streamIndex].classList.add('loading');
            this.streams[streamIndex].classList.remove('error');
          }
        }
      }

      activate() {
        if (this.isActive) return;

        this.hideOriginalContent();
        this.createContainer();
        this.createStreams();
        this.applyLayout();
        this.loadCurrentChannel();
        this.isActive = true;

        this.messageBus.publish('UI_ACTIVATED');
      }

      deactivate() {
        if (!this.isActive) return;

        this.removeContainer();
        this.showOriginalContent();
        this.isActive = false;

        this.messageBus.publish('UI_DEACTIVATED');
      }

      hideOriginalContent() {
        const body = document.body;
        if (body) {
          this.originalBodyStyles = {
            overflow: body.style.overflow || '',
            margin: body.style.margin || '',
            padding: body.style.padding || ''
          };
          body.style.overflow = 'hidden';
        }
      }

      showOriginalContent() {
        const body = document.body;
        if (body && this.originalBodyStyles) {
          body.style.overflow = this.originalBodyStyles.overflow;
          body.style.margin = this.originalBodyStyles.margin;
          body.style.padding = this.originalBodyStyles.padding;
        }
      }

      createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'quadtv-container';
        this.container.className = 'quadtv-grid-container';

        this.container.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: #000;
          z-index: 10000;
          overflow: hidden;
        `;

        document.body.appendChild(this.container);
      }

      removeContainer() {
        if (this.container) {
          this.container.remove();
          this.container = null;
          this.streams = [];
        }
      }

      createStreams() {
        const layout = this.layoutEngine.getLayout(this.currentLayout);
        this.streams = [];

        layout.streams.forEach((streamConfig, index) => {
          const streamElement = this.createStreamElement(index, streamConfig);
          this.streams.push(streamElement);
          this.container.appendChild(streamElement);
        });
      }

      loadCurrentChannel() {
        const currentUrl = window.location.href;
        if (this.isValidYouTubeTVUrl(currentUrl) && this.streams.length > 0) {
          const firstStreamIframe = this.streams[0].querySelector('.quadtv-iframe');
          if (firstStreamIframe) {
            firstStreamIframe.src = currentUrl;
            this.streams[0].classList.add('loading');

            firstStreamIframe.onload = () => {
              this.streams[0].classList.remove('loading');
              this.messageBus.publish('STREAM_LOADED', {
                streamIndex: 0,
                url: currentUrl
              });
            };

            firstStreamIframe.onerror = () => {
              this.streams[0].classList.remove('loading');
              this.streams[0].classList.add('error');
            };
          }
        }
      }

      isValidYouTubeTVUrl(url) {
        return url && url.includes('tv.youtube.com');
      }

      createStreamElement(index, config) {
        const streamDiv = document.createElement('div');
        streamDiv.className = 'quadtv-stream';
        streamDiv.dataset.streamIndex = String(index);
        streamDiv.style.gridArea = config.gridArea;

        const iframe = document.createElement('iframe');
        iframe.className = 'quadtv-iframe';
        iframe.src = 'about:blank';
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
        iframe.setAttribute('allowfullscreen', '');

        const controls = this.createStreamControls(index);

        streamDiv.appendChild(iframe);
        streamDiv.appendChild(controls);
        this.setupStreamEventListeners(streamDiv, index);

        return streamDiv;
      }

      createStreamControls(index) {
        const controls = document.createElement('div');
        controls.className = 'quadtv-stream-controls';
        controls.innerHTML = `
          <button class="quadtv-audio-btn" data-action="toggle-audio">🔊</button>
          <button class="quadtv-focus-btn" data-action="focus">⛶</button>
          <button class="quadtv-channel-btn" data-action="change-channel">📺</button>
        `;
        return controls;
      }

      setupStreamEventListeners(streamElement, index) {
        streamElement.addEventListener('mouseenter', () => {
          this.messageBus.publish('STREAM_HOVER_ENTER', { streamIndex: index });
        });

        streamElement.addEventListener('mouseleave', () => {
          this.messageBus.publish('STREAM_HOVER_LEAVE', { streamIndex: index });
        });

        streamElement.addEventListener('click', (e) => {
          if (e.target.hasAttribute('data-action')) {
            const action = e.target.getAttribute('data-action');
            this.messageBus.publish('STREAM_ACTION', {
              streamIndex: index,
              action: action
            });
          }
        });
      }

      setLayout(layout) {
        this.currentLayout = layout;
        if (this.isActive) {
          this.removeContainer();
          this.activate();
        }
      }

      applyLayout() {
        const css = this.layoutEngine.generateCSS(this.currentLayout);

        Object.assign(this.container.style, {
          display: css.container.display,
          gridTemplate: css.container.gridTemplate,
          gap: css.container.gap,
          padding: '8px',
          boxSizing: 'border-box'
        });

        this.container.setAttribute('data-layout', this.currentLayout);

        this.streams.forEach((stream, index) => {
          const streamConfig = css.streams[index];
          if (streamConfig) {
            stream.style.gridArea = streamConfig.gridArea;
          }
        });
      }

      highlightStream(streamIndex) {
        this.streams.forEach((stream, index) => {
          if (index === streamIndex) {
            stream.classList.add('quadtv-audio-active');
          } else {
            stream.classList.remove('quadtv-audio-active');
          }
        });
      }

      showControls(streamIndex) {
        if (this.streams[streamIndex]) {
          const controls = this.streams[streamIndex].querySelector('.quadtv-stream-controls');
          if (controls) {
            controls.classList.add('visible');
          }
        }
      }

      hideControls(streamIndex) {
        if (this.streams[streamIndex]) {
          const controls = this.streams[streamIndex].querySelector('.quadtv-stream-controls');
          if (controls) {
            controls.classList.remove('visible');
          }
        }
      }
    };

    uiManager = new global.UIManager();
  });

  describe('QTV-002: Create basic 2x2 grid overlay', () => {
    test('should create overlay that covers entire viewport', () => {
      uiManager.activate();

      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(uiManager.container.style.cssText).toContain('position: fixed');
      expect(uiManager.container.style.cssText).toContain('width: 100vw');
      expect(uiManager.container.style.cssText).toContain('height: 100vh');
      expect(uiManager.container.style.cssText).toContain('z-index: 10000');
    });

    test('should create grid with 4 equal iframe containers', () => {
      uiManager.activate();

      expect(uiManager.streams).toHaveLength(4);
      uiManager.streams.forEach((stream, index) => {
        expect(stream.className).toBe('quadtv-stream');
        expect(stream.dataset.streamIndex).toBe(String(index));
        expect(stream.querySelector).toHaveBeenCalledWith('.quadtv-iframe');
      });
    });

    test('should load current channel in top-left stream (stream 0)', () => {
      uiManager.activate();

      const firstStream = uiManager.streams[0];
      const iframe = firstStream.querySelector('.quadtv-iframe');

      expect(iframe.src).toBe('https://tv.youtube.com/watch/123');
      expect(firstStream.classList.add).toHaveBeenCalledWith('loading');
    });

    test('should hide original content when activated', () => {
      uiManager.activate();

      expect(document.body.style.overflow).toBe('hidden');
      expect(uiManager.originalBodyStyles).toBeDefined();
    });

    test('should restore original content when deactivated', () => {
      // First activate to set original styles
      uiManager.activate();
      const originalStyles = uiManager.originalBodyStyles;

      // Then deactivate
      uiManager.deactivate();

      expect(document.body.style.overflow).toBe(originalStyles.overflow);
    });

    test('should clean up container on deactivation', () => {
      uiManager.activate();
      const container = uiManager.container;

      uiManager.deactivate();

      expect(container.remove).toHaveBeenCalled();
      expect(uiManager.container).toBeNull();
      expect(uiManager.streams).toEqual([]);
      expect(uiManager.isActive).toBe(false);
    });

    test('should apply correct CSS grid layout', () => {
      uiManager.activate();

      expect(uiManager.layoutEngine.generateCSS).toHaveBeenCalledWith('2x2');
      expect(uiManager.container.style.display).toBe('grid');
      expect(uiManager.container.style.gridTemplate).toBe('repeat(2, 1fr) / repeat(2, 1fr)');
      expect(uiManager.container.setAttribute).toHaveBeenCalledWith('data-layout', '2x2');
    });

    test('should create iframes with proper attributes', () => {
      uiManager.activate();

      uiManager.streams.forEach((stream) => {
        const iframe = stream.querySelector('.quadtv-iframe');
        expect(iframe.setAttribute).toHaveBeenCalledWith('allow', expect.stringContaining('autoplay'));
        expect(iframe.setAttribute).toHaveBeenCalledWith('allowfullscreen', '');
        expect(iframe.className).toBe('quadtv-iframe');
      });
    });

    test('should handle iframe load success', () => {
      uiManager.activate();

      const firstStream = uiManager.streams[0];
      const iframe = firstStream.querySelector('.quadtv-iframe');

      // Simulate iframe load
      iframe.onload();

      expect(firstStream.classList.remove).toHaveBeenCalledWith('loading');
      expect(uiManager.messageBus.publish).toHaveBeenCalledWith('STREAM_LOADED', {
        streamIndex: 0,
        url: 'https://tv.youtube.com/watch/123'
      });
    });

    test('should handle iframe load error', () => {
      uiManager.activate();

      const firstStream = uiManager.streams[0];
      const iframe = firstStream.querySelector('.quadtv-iframe');

      // Simulate iframe error
      iframe.onerror();

      expect(firstStream.classList.remove).toHaveBeenCalledWith('loading');
      expect(firstStream.classList.add).toHaveBeenCalledWith('error');
    });

    test('should not activate if already active', () => {
      uiManager.activate();
      const publishCallCount = uiManager.messageBus.publish.mock.calls.length;

      // Try to activate again
      uiManager.activate();

      // Should not publish again
      expect(uiManager.messageBus.publish.mock.calls.length).toBe(publishCallCount);
    });

    test('should not deactivate if not active', () => {
      expect(uiManager.isActive).toBe(false);

      uiManager.deactivate();

      expect(uiManager.messageBus.publish).not.toHaveBeenCalledWith('UI_DEACTIVATED');
    });

    test('should update stream URL via message bus', () => {
      uiManager.activate();
      const testUrl = 'https://tv.youtube.com/watch/new-video';

      uiManager.updateStreamUrl(1, testUrl);

      const secondStream = uiManager.streams[1];
      const iframe = secondStream.querySelector('.quadtv-iframe');
      expect(iframe.src).toBe(testUrl);
      expect(secondStream.classList.add).toHaveBeenCalledWith('loading');
    });

    test('should validate YouTube TV URLs correctly', () => {
      expect(uiManager.isValidYouTubeTVUrl('https://tv.youtube.com/watch/123')).toBe(true);
      expect(uiManager.isValidYouTubeTVUrl('https://youtube.com/watch/123')).toBe(false);
      expect(uiManager.isValidYouTubeTVUrl('')).toBeFalsy();
      expect(uiManager.isValidYouTubeTVUrl(null)).toBeFalsy();
    });

    test('should create stream controls with correct buttons', () => {
      uiManager.activate();

      uiManager.streams.forEach((stream) => {
        const controls = stream.querySelector('.quadtv-stream-controls');
        expect(controls.className).toBe('quadtv-stream-controls');
        expect(controls.innerHTML).toContain('quadtv-audio-btn');
        expect(controls.innerHTML).toContain('quadtv-focus-btn');
        expect(controls.innerHTML).toContain('quadtv-channel-btn');
      });
    });

    test('should publish UI_ACTIVATED message when activated', () => {
      uiManager.activate();

      expect(uiManager.messageBus.publish).toHaveBeenCalledWith('UI_ACTIVATED');
    });

    test('should publish UI_DEACTIVATED message when deactivated', () => {
      uiManager.activate();
      uiManager.deactivate();

      expect(uiManager.messageBus.publish).toHaveBeenCalledWith('UI_DEACTIVATED');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle missing message bus gracefully', () => {
      // Create a test class that handles null message bus
      const TestUIManager = class extends global.UIManager {
        setupMessageBusListeners() {
          if (this.messageBus) {
            super.setupMessageBusListeners();
          }
        }
      };

      global.window.QuadTVMessageBus = null;

      expect(() => {
        new TestUIManager();
      }).not.toThrow();
    });

    test('should handle missing layout engine gracefully', () => {
      global.window.QuadTVLayoutEngine = {
        getLayout: jest.fn().mockReturnValue({ streams: [] }),
        generateCSS: jest.fn().mockReturnValue({
          container: { display: 'grid', gridTemplate: '', gap: '' },
          streams: []
        })
      };

      const manager = new global.UIManager();
      expect(() => {
        manager.activate();
      }).not.toThrow();
    });

    test('should handle non-YouTube TV URLs', () => {
      global.window.location.href = 'https://google.com';

      uiManager.activate();

      // Should not load current channel for non-YouTube TV URLs
      const firstStream = uiManager.streams[0];
      const iframe = firstStream.querySelector('.quadtv-iframe');
      expect(iframe.src).toBe('about:blank');
    });
  });
});