class UIManager {
  constructor() {
    this.isActive = false;
    this.currentLayout = '2x2';
    this.container = null;
    this.streams = [];
    this.messageBus = window.QuadTVMessageBus;
    this.layoutEngine = window.QuadTVLayoutEngine;
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

        // Add loading state
        this.streams[streamIndex].classList.add('loading');
        this.streams[streamIndex].classList.remove('error');

        iframe.onload = () => {
          this.streams[streamIndex].classList.remove('loading');
        };

        iframe.onerror = () => {
          this.streams[streamIndex].classList.remove('loading');
          this.streams[streamIndex].classList.add('error');
        };
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
    // Hide the original YouTube TV interface
    const body = document.body;
    if (body) {
      body.style.overflow = 'hidden';
      // Store original styles for restoration
      this.originalBodyStyles = {
        overflow: body.style.overflow || '',
        margin: body.style.margin || '',
        padding: body.style.padding || ''
      };
    }
  }

  showOriginalContent() {
    // Restore the original YouTube TV interface
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

    // Set the container to cover the entire viewport
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
    // Get the current YouTube TV URL and load it into the first stream (top-left)
    const currentUrl = window.location.href;
    if (this.isValidYouTubeTVUrl(currentUrl) && this.streams.length > 0) {
      const firstStreamIframe = this.streams[0].querySelector('.quadtv-iframe');
      if (firstStreamIframe) {
        // Set iframe src to current page URL
        firstStreamIframe.src = currentUrl;

        // Add loading indicator
        this.streams[0].classList.add('loading');

        // Handle iframe load
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
    streamDiv.dataset.streamIndex = index;
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

    // Apply grid layout to container
    Object.assign(this.container.style, {
      display: css.container.display,
      gridTemplate: css.container.gridTemplate,
      gap: css.container.gap,
      padding: '8px',
      boxSizing: 'border-box'
    });

    // Set data attribute for CSS targeting
    this.container.setAttribute('data-layout', this.currentLayout);

    // Apply specific grid areas to stream elements
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
      controls.classList.add('visible');
    }
  }

  hideControls(streamIndex) {
    if (this.streams[streamIndex]) {
      const controls = this.streams[streamIndex].querySelector('.quadtv-stream-controls');
      controls.classList.remove('visible');
    }
  }
}

window.QuadTVUIManager = new UIManager();