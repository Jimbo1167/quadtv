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
  }

  activate() {
    if (this.isActive) return;

    this.createContainer();
    this.createStreams();
    this.applyLayout();
    this.isActive = true;

    this.messageBus.publish('UI_ACTIVATED');
  }

  deactivate() {
    if (!this.isActive) return;

    this.removeContainer();
    this.isActive = false;

    this.messageBus.publish('UI_DEACTIVATED');
  }

  createContainer() {
    this.container = document.createElement('div');
    this.container.id = 'quadtv-container';
    this.container.className = 'quadtv-grid-container';

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

  createStreamElement(index, config) {
    const streamDiv = document.createElement('div');
    streamDiv.className = 'quadtv-stream';
    streamDiv.dataset.streamIndex = index;
    streamDiv.style.gridArea = config.gridArea;

    const iframe = document.createElement('iframe');
    iframe.className = 'quadtv-iframe';
    iframe.src = 'about:blank';

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
      width: css.container.width,
      height: css.container.height
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