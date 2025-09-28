class UIManager {
  constructor() {
    this.isActive = false;
    this.currentLayout = '2x2';
    this.container = null;
    this.streamTabs = new Map(); // Map<streamIndex, tabId>
    this.activeAudioTab = null;
    this.isControlTab = false;
    this.messageBus = window.QuadTVMessageBus;
    this.layoutEngine = window.QuadTVLayoutEngine;
    this.init();
  }

  init() {
    this.setupMessageBusListeners();
  }

  setupMessageBusListeners() {
    this.messageBus.subscribe('QUADTV_ACTIVATED', (data) => this.onQuadTVActivated(data));
    this.messageBus.subscribe('QUADTV_DEACTIVATED', () => this.deactivate());
    this.messageBus.subscribe('AUDIO_CHANGED', (data) => this.onAudioChanged(data));
    this.messageBus.subscribe('SET_AUDIO_STATE', (data) => this.setAudioState(data));
    this.messageBus.subscribe('SET_LAYOUT', (data) => this.setLayout(data.layout));
    this.messageBus.subscribe('HIGHLIGHT_STREAM', (data) => this.highlightStream(data.streamIndex));
    this.messageBus.subscribe('SHOW_CONTROLS', (data) => this.showControls(data.streamIndex));
    this.messageBus.subscribe('HIDE_CONTROLS', (data) => this.hideControls(data.streamIndex));
  }

  onQuadTVActivated(data) {
    console.log('📺 Tab: QuadTV activated', data);

    // Store tab mapping and state
    this.streamTabs = new Map(data.streamTabs);
    this.activeAudioTab = data.activeAudioTab;
    this.isControlTab = this.streamTabs.get(0) === this.getCurrentTabId();

    this.activate();
  }

  onAudioChanged(data) {
    console.log('🔊 Tab: Audio changed', data);
    this.activeAudioTab = data.activeAudioTab;
    this.updateAudioIndicator();
  }

  setAudioState(data) {
    console.log(`🔊 Tab: Setting audio ${data.hasAudio ? 'ON' : 'OFF'} (stream ${data.streamIndex})`);

    const video = document.querySelector('video');
    if (video) {
      if (data.hasAudio) {
        video.muted = false;
        video.play().catch(e => console.log('Play failed:', e));
        console.log('🔊 Audio enabled for this tab');
      } else {
        video.muted = true;
        console.log('🔇 Audio muted for this tab');
      }
    }

    this.updateAudioIndicator();
  }

  getCurrentTabId() {
    // In a real implementation, this would be provided by the background script
    // For now, we'll use a placeholder that gets set by the background script
    return window.quadTVCurrentTabId;
  }

  activate() {
    if (this.isActive) return;

    this.createIndicator();
    this.isActive = true;

    console.log('📺 Tab: UI activated with indicator');
    this.messageBus.publish('UI_ACTIVATED');
  }

  deactivate() {
    if (!this.isActive) return;

    this.removeIndicator();
    this.isActive = false;

    console.log('📺 Tab: UI deactivated');
    this.messageBus.publish('UI_DEACTIVATED');
  }

  createIndicator() {
    this.indicator = document.createElement('div');
    this.indicator.id = 'quadtv-tab-indicator';
    this.indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #ff0000;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      z-index: 10000;
      cursor: pointer;
      user-select: none;
    `;

    this.updateIndicatorText();

    // Add click handler for audio switching
    this.indicator.addEventListener('click', () => {
      this.handleIndicatorClick();
    });

    document.body.appendChild(this.indicator);
  }

  removeIndicator() {
    if (this.indicator) {
      this.indicator.remove();
      this.indicator = null;
    }
  }

  updateIndicatorText() {
    if (!this.indicator) return;

    const currentTabId = this.getCurrentTabId();
    let streamIndex = null;

    // Find which stream this tab represents
    for (const [index, tabId] of this.streamTabs.entries()) {
      if (tabId === currentTabId) {
        streamIndex = index;
        break;
      }
    }

    if (streamIndex !== null) {
      const isAudioActive = currentTabId === this.activeAudioTab;
      const audioIcon = isAudioActive ? '🔊' : '🔇';
      const audioText = isAudioActive ? 'AUDIO' : 'MUTED';
      this.indicator.textContent = `Stream ${streamIndex} - ${audioIcon} ${audioText}`;
    } else {
      this.indicator.textContent = 'QuadTV Active';
    }
  }

  updateAudioIndicator() {
    this.updateIndicatorText();
  }

  handleIndicatorClick() {
    const currentTabId = this.getCurrentTabId();
    let streamIndex = null;

    // Find which stream this tab represents
    for (const [index, tabId] of this.streamTabs.entries()) {
      if (tabId === currentTabId) {
        streamIndex = index;
        break;
      }
    }

    if (streamIndex !== null && currentTabId !== this.activeAudioTab) {
      console.log(`🔊 Tab: Requesting audio switch to stream ${streamIndex}`);

      // Send message to background to switch audio to this tab
      browser.runtime.sendMessage({
        type: 'SWITCH_AUDIO',
        streamIndex: streamIndex
      }).catch(error => {
        console.error('Failed to switch audio:', error);
      });
    }
  }

  // Multi-tab approach: no longer creating streams in this tab
  // Each tab displays its own YouTube TV content natively
  // The indicator shows which tab has audio and allows switching

  setLayout(layout) {
    this.currentLayout = layout;
    // In multi-tab approach, layout changes would be coordinated
    // across all tabs through the background script
    this.messageBus.publish('LAYOUT_CHANGED', { layout });
  }

  highlightStream(streamIndex) {
    // In multi-tab approach, highlighting is done via the indicator
    this.updateAudioIndicator();
  }

  showControls(streamIndex) {
    // Controls are now embedded in the indicator
    // Future: Could show additional controls overlay
  }

  hideControls(streamIndex) {
    // Controls are always visible via indicator
    // Future: Could hide additional controls overlay
  }
}

window.QuadTVUIManager = new UIManager();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UIManager };
}