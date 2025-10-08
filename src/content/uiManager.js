class UIManager {
  constructor() {
    this.isActive = false;
    this.currentLayout = '2x2';
    this.container = null;
    this.messageBus = window.QuadTVMessageBus;
    this.layoutEngine = window.QuadTVLayoutEngine;
    this.iframes = []; // Store iframe references
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
  }

  setupKeyboardShortcuts() {
    this.keyboardHandler = (event) => this.handleKeyboardShortcut(event);
  }

  handleKeyboardShortcut(event) {
    if (!this.isActive) return;

    // Ignore if user is typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable) {
      return;
    }

    const key = event.key;

    // ESC to deactivate QuadTV
    if (key === 'Escape') {
      event.preventDefault();
      console.log('🎹 Keyboard shortcut: Deactivating QuadTV');
      this.messageBus.publish('QUADTV_DEACTIVATED');
      return;
    }

    // Space to toggle between layouts
    if (key === ' ' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      console.log('🎹 Keyboard shortcut: Cycling layout');
      this.cycleLayout();
      return;
    }

    // ? to show help
    if (key === '?' || key === '/') {
      event.preventDefault();
      console.log('🎹 Keyboard shortcut: Showing help');
      this.showOnboarding();
      return;
    }
  }

  cycleLayout() {
    const layouts = ['2x2', '1+2', '2-vertical'];
    const currentIndex = layouts.indexOf(this.currentLayout);
    const nextIndex = (currentIndex + 1) % layouts.length;
    const nextLayout = layouts[nextIndex];

    console.log(`🔄 Cycling from ${this.currentLayout} to ${nextLayout}`);
    this.setLayout(nextLayout);
  }

  getStreamCountForLayout(layout) {
    const counts = {
      '2x2': 4,
      '1+2': 3,
      '2-vertical': 2
    };
    return counts[layout] || 4;
  }

  showOnboardingIfNeeded() {
    try {
      const hasSeenOnboarding = localStorage.getItem('quadtv-onboarding-seen');
      if (!hasSeenOnboarding) {
        setTimeout(() => this.showOnboarding(), 1000);
        localStorage.setItem('quadtv-onboarding-seen', 'true');
      }
    } catch (error) {
      console.warn('Failed to check onboarding state:', error);
    }
  }

  showOnboarding() {
    const helpOverlay = document.createElement('div');
    helpOverlay.id = 'quadtv-onboarding';
    helpOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10002;
      font-family: Arial, sans-serif;
    `;

    const helpContent = document.createElement('div');
    helpContent.style.cssText = `
      background: #1a1a1a;
      border: 2px solid #ff0000;
      border-radius: 8px;
      padding: 24px;
      max-width: 500px;
      color: white;
      text-align: center;
    `;

    helpContent.innerHTML = `
      <h2 style="color: #ff0000; margin-top: 0;">🎬 Welcome to QuadTV!</h2>
      <div style="text-align: left; margin: 16px 0;">
        <h3>🎹 Keyboard Shortcuts:</h3>
        <p><strong>Ctrl/Cmd + Space</strong> - Cycle layouts (2x2, 1+2, 2-vertical)</p>
        <p><strong>Esc</strong> - Exit QuadTV</p>
        <p><strong>?</strong> - Show this help</p>

        <h3>📺 Multi-Stream Viewing:</h3>
        <p>Watch multiple YouTube TV channels simultaneously</p>
        <p>Control audio individually within each stream</p>
        <p>Switch layouts to customize your viewing experience</p>
      </div>
      <button id="quadtv-help-close" style="
        background: #ff0000;
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      ">Got it!</button>
    `;

    helpOverlay.appendChild(helpContent);
    document.body.appendChild(helpOverlay);

    const closeHelp = () => {
      if (helpOverlay.parentNode) {
        helpOverlay.parentNode.removeChild(helpOverlay);
      }
    };

    helpContent.querySelector('#quadtv-help-close').addEventListener('click', closeHelp);
    helpOverlay.addEventListener('click', (e) => {
      if (e.target === helpOverlay) closeHelp();
    });

    setTimeout(closeHelp, 10000);
  }

  onQuadTVActivated(data) {
    console.log('📺 QuadTV: Activating iframe grid', data);

    if (data.layout) {
      this.currentLayout = data.layout;
      console.log(`📐 UI: Layout set to ${data.layout}`);
    }

    if (this.isActive) {
      if (data.layout) {
        console.log(`📐 UI: Already active, updating layout to ${data.layout}`);
        this.setLayout(data.layout);
      }
    } else {
      this.activate();
    }
  }

  activate() {
    if (this.isActive) return;

    this.createQuadTVGrid();
    this.isActive = true;

    // Add keyboard shortcuts
    document.addEventListener('keydown', this.keyboardHandler, { capture: true, passive: false });

    console.log('📺 Tab: QuadTV grid activated');
    this.messageBus.publish('UI_ACTIVATED');
  }

  deactivate() {
    if (!this.isActive) return;

    // Remove keyboard shortcuts
    document.removeEventListener('keydown', this.keyboardHandler, { capture: true, passive: false });

    // Remove QuadTV grid
    this.removeQuadTVGrid();

    this.isActive = false;

    console.log('📺 Tab: QuadTV grid deactivated');
    this.messageBus.publish('UI_DEACTIVATED');
  }

  createQuadTVGrid() {
    // Create main container
    this.quadTVContainer = document.createElement('div');
    this.quadTVContainer.id = 'quadtv-container';

    // Create grid container
    this.gridContainer = document.createElement('div');
    this.gridContainer.className = 'quadtv-grid-container';
    this.gridContainer.setAttribute('data-layout', this.currentLayout);

    // Create maximum stream containers (4) and show/hide based on layout
    this.streams = [];
    const maxStreams = 4;

    for (let i = 0; i < maxStreams; i++) {
      const streamContainer = this.createStreamContainer(i);
      this.streams.push(streamContainer);
      this.gridContainer.appendChild(streamContainer);
    }

    this.quadTVContainer.appendChild(this.gridContainer);
    document.body.appendChild(this.quadTVContainer);

    // Apply initial layout
    this.updateGridLayout(this.currentLayout);

    // Show onboarding help if first time user
    this.showOnboardingIfNeeded();

    console.log('📺 QuadTV grid created');
  }

  createStreamContainer(index) {
    const container = document.createElement('div');
    container.className = 'quadtv-stream';
    container.dataset.streamIndex = index;

    // Create iframe for YouTube TV
    const iframe = document.createElement('iframe');
    iframe.className = 'quadtv-iframe';
    iframe.src = 'https://tv.youtube.com';
    iframe.allow = 'autoplay; fullscreen';
    iframe.setAttribute('loading', 'lazy');
    iframe.dataset.streamIndex = index;

    // Store iframe reference
    this.iframes[index] = iframe;

    // Create stream number indicator
    const streamNumber = document.createElement('div');
    streamNumber.className = 'stream-number';
    streamNumber.textContent = `${index + 1}`;

    container.appendChild(iframe);
    container.appendChild(streamNumber);

    return container;
  }

  removeQuadTVGrid() {
    if (this.quadTVContainer) {
      this.quadTVContainer.remove();
      this.quadTVContainer = null;
      this.gridContainer = null;
      this.streams = [];
      this.iframes = [];
    }
  }

  setLayout(layout) {
    console.log(`📐 UI: Setting layout to ${layout}`);
    this.currentLayout = layout;

    if (!this.isActive) {
      console.log('📐 UI: QuadTV not active, storing layout preference');
      return;
    }

    this.updateGridLayout(layout);
    console.log(`✅ UI: Layout changed to ${layout}`);
  }

  updateGridLayout(layout) {
    const gridContainer = document.querySelector('.quadtv-grid-container');
    if (!gridContainer) {
      console.warn('📐 UI: Grid container not found');
      return;
    }

    // Set layout data attribute for CSS styling
    gridContainer.setAttribute('data-layout', layout);
    console.log(`📐 UI: Set data-layout="${layout}" on grid container`);

    // Update grid CSS based on layout
    const layoutStyles = {
      '2x2': {
        'grid-template-columns': '1fr 1fr',
        'grid-template-rows': '1fr 1fr',
        'gap': '8px'
      },
      '1+2': {
        'grid-template-columns': '2fr 1fr',
        'grid-template-rows': '1fr 1fr',
        'gap': '8px'
      },
      '2-vertical': {
        'grid-template-columns': '1fr 1fr',
        'grid-template-rows': '1fr',
        'gap': '8px'
      }
    };

    const styles = layoutStyles[layout] || layoutStyles['2x2'];
    Object.assign(gridContainer.style, {
      display: 'grid',
      width: '100%',
      height: '100%',
      ...styles
    });

    // Show/hide streams based on layout requirements
    const requiredStreams = this.getStreamCountForLayout(layout);
    const allStreams = document.querySelectorAll('.quadtv-stream');

    allStreams.forEach((stream, index) => {
      if (index < requiredStreams) {
        stream.style.display = 'block';
        console.log(`📐 UI: Showing stream ${index}`);
      } else {
        stream.style.display = 'none';
        console.log(`📐 UI: Hiding stream ${index}`);
      }
    });

    console.log(`📐 UI: Grid layout updated to ${layout} with ${requiredStreams} streams`);
  }
}

window.QuadTVUIManager = new UIManager();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UIManager };
}
