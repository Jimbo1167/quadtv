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

    // Enhanced audio control with validation
    const video = document.querySelector('video');
    if (video) {
      if (data.hasAudio) {
        this.enableAudio(video);
      } else {
        this.disableAudio(video);
      }
    }

    // Update visual indicators
    this.updateAudioIndicator();
    this.updatePageBorder(data.hasAudio);

    // Store audio state for persistence
    this.hasAudio = data.hasAudio;
    this.streamIndex = data.streamIndex;
  }

  enableAudio(video) {
    try {
      video.muted = false;
      video.volume = 1.0; // Ensure volume is at maximum

      // Attempt to play if paused
      if (video.paused) {
        video.play().catch(e => console.log('Play attempt failed:', e));
      }

      console.log('🔊 Audio enabled for this tab');

      // Monitor for YouTube TV attempting to mute
      this.setupAudioMonitoring(video);
    } catch (error) {
      console.error('Failed to enable audio:', error);
    }
  }

  disableAudio(video) {
    try {
      video.muted = true;
      console.log('🔇 Audio muted for this tab');

      // Clear audio monitoring
      this.clearAudioMonitoring();
    } catch (error) {
      console.error('Failed to disable audio:', error);
    }
  }

  setupAudioMonitoring(video) {
    // Clear any existing monitoring
    this.clearAudioMonitoring();

    // Monitor for volume/mute changes by YouTube TV
    this.audioMonitorInterval = setInterval(() => {
      if (this.hasAudio && video.muted) {
        console.log('⚠️ Audio was muted by YouTube TV, restoring...');
        video.muted = false;
      }
    }, 500);
  }

  clearAudioMonitoring() {
    if (this.audioMonitorInterval) {
      clearInterval(this.audioMonitorInterval);
      this.audioMonitorInterval = null;
    }
  }

  clearAudioFlashTimeout() {
    if (this.audioFlashTimeout) {
      clearTimeout(this.audioFlashTimeout);
      this.audioFlashTimeout = null;
    }
  }

  updatePageBorder(hasAudio) {
    // Add/remove red border to indicate active audio stream
    const body = document.body;
    if (hasAudio) {
      body.style.border = '4px solid #ff0000';
      body.style.boxSizing = 'border-box';
    } else {
      body.style.border = 'none';
    }
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

    // Clean up audio monitoring
    this.clearAudioMonitoring();

    // Clean up any pending timeouts
    this.clearAudioFlashTimeout();

    // Remove visual indicators
    this.removeIndicator();
    this.updatePageBorder(false);

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

    if (streamIndex !== null) {
      if (currentTabId !== this.activeAudioTab) {
        console.log(`🔊 Tab: Requesting audio switch to stream ${streamIndex}`);

        // Send message to background to switch audio to this tab
        browser.runtime.sendMessage({
          type: 'SWITCH_AUDIO',
          streamIndex: streamIndex
        }).catch(error => {
          console.error('Failed to switch audio:', error);
        });
      } else {
        console.log(`🔊 Tab: Stream ${streamIndex} already has audio`);
        // Add visual feedback for already active state
        this.showAudioActiveFlash();
      }
    }
  }

  showAudioActiveFlash() {
    // Brief visual feedback when clicking already active audio tab
    if (this.indicator) {
      const originalBg = this.indicator.style.background;
      this.indicator.style.background = '#00ff00';
      this.audioFlashTimeout = setTimeout(() => {
        if (this.indicator) { // Check if indicator still exists
          this.indicator.style.background = originalBg;
        }
        this.audioFlashTimeout = null;
      }, 200);
    }
  }

  // Multi-tab approach: no longer creating streams in this tab
  // Each tab displays its own YouTube TV content natively
  // The indicator shows which tab has audio and allows switching

  setLayout(layout) {
    this.currentLayout = layout;

    // Preserve audio state during layout changes (QTV-004 requirement)
    const preservedAudioState = {
      hasAudio: this.hasAudio,
      streamIndex: this.streamIndex,
      activeAudioTab: this.activeAudioTab
    };

    // In multi-tab approach, layout changes would be coordinated
    // across all tabs through the background script
    this.messageBus.publish('LAYOUT_CHANGED', {
      layout,
      preserveAudio: preservedAudioState
    });

    // Ensure audio state persists after layout change
    if (this.hasAudio) {
      setTimeout(() => {
        this.validateAudioState();
      }, 100);
    }
  }

  validateAudioState() {
    // Ensure audio state is still correct after layout changes
    const video = document.querySelector('video');
    if (video && this.hasAudio) {
      if (video.muted) {
        console.log('⚠️ Audio state lost during layout change, restoring...');
        this.enableAudio(video);
      }
    }
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