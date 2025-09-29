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
    this.messageBus.subscribe('LAYOUT_CHANGED', (data) => this.onLayoutChanged(data));
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

    this.createQuadTVGrid();
    this.isActive = true;

    console.log('📺 Tab: QuadTV grid activated');
    this.messageBus.publish('UI_ACTIVATED');
  }

  deactivate() {
    if (!this.isActive) return;

    // Clean up audio monitoring
    this.clearAudioMonitoring();

    // Clean up any pending timeouts
    this.clearAudioFlashTimeout();

    // Remove QuadTV grid
    this.removeQuadTVGrid();

    this.isActive = false;

    console.log('📺 Tab: QuadTV grid deactivated');
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

  createQuadTVGrid() {
    // Create main container
    this.quadTVContainer = document.createElement('div');
    this.quadTVContainer.id = 'quadtv-container';

    // Create grid container
    this.gridContainer = document.createElement('div');
    this.gridContainer.className = 'quadtv-grid-container';
    this.gridContainer.setAttribute('data-layout', this.currentLayout);

    // Create stream containers with iframes based on layout
    this.streams = [];
    const streamCount = this.getStreamCountForLayout(this.currentLayout);

    for (let i = 0; i < streamCount; i++) {
      const streamContainer = this.createStreamContainer(i);
      this.streams.push(streamContainer);
      this.gridContainer.appendChild(streamContainer);
    }

    this.quadTVContainer.appendChild(this.gridContainer);
    document.body.appendChild(this.quadTVContainer);

    // Apply initial layout
    this.updateGridLayout(this.currentLayout);

    // Set first stream as active audio by default
    this.setActiveAudioStream(0);

    console.log('📺 QuadTV grid created with 4 streams');
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

    // Create stream controls
    const controls = this.createStreamControls(index);

    container.appendChild(iframe);
    container.appendChild(controls);

    // Add click handler for audio switching
    container.addEventListener('click', (e) => {
      if (!e.target.closest('.quadtv-stream-controls')) {
        this.setActiveAudioStream(index);
      }
    });

    return container;
  }

  createStreamControls(index) {
    const controls = document.createElement('div');
    controls.className = 'quadtv-stream-controls';

    // Audio button
    const audioBtn = document.createElement('button');
    audioBtn.className = 'quadtv-audio-btn';
    audioBtn.innerHTML = '🔊';
    audioBtn.title = 'Switch audio to this stream';
    audioBtn.onclick = (e) => {
      e.stopPropagation();
      this.setActiveAudioStream(index);
    };

    // Focus button
    const focusBtn = document.createElement('button');
    focusBtn.className = 'quadtv-focus-btn';
    focusBtn.innerHTML = '⛶';
    focusBtn.title = 'Focus this stream';
    focusBtn.onclick = (e) => {
      e.stopPropagation();
      this.focusStream(index);
    };

    controls.appendChild(audioBtn);
    controls.appendChild(focusBtn);

    return controls;
  }

  removeQuadTVGrid() {
    if (this.quadTVContainer) {
      this.quadTVContainer.remove();
      this.quadTVContainer = null;
      this.gridContainer = null;
      this.streams = [];
    }
  }

  setActiveAudioStream(index) {
    // Remove active class from all streams
    const streams = document.querySelectorAll('.quadtv-stream');
    streams.forEach(stream => stream.classList.remove('quadtv-audio-active'));

    // Add active class to selected stream
    if (streams[index]) {
      streams[index].classList.add('quadtv-audio-active');
      this.activeAudioStream = index;
      console.log(`🔊 Audio switched to stream ${index}`);
    }
  }

  focusStream(index) {
    const stream = document.querySelector(`[data-stream-index="${index}"]`);
    if (stream) {
      stream.classList.toggle('focus-mode');
      console.log(`🎯 Stream ${index} focus toggled`);
    }
  }

  getStreamCountForLayout(layout) {
    const counts = {
      '2x2': 4,
      '1+3': 4,
      '2-vertical': 2
    };
    return counts[layout] || 4;
  }

  setLayout(layout) {
    console.log(`📐 UI: Setting layout to ${layout}`);
    this.currentLayout = layout;

    if (!this.isActive) {
      console.log('📐 UI: QuadTV not active, storing layout preference');
      return;
    }

    // Preserve audio state during layout changes
    const activeStreamIndex = this.findActiveAudioStream();

    // Update the grid layout
    this.updateGridLayout(layout);

    // Restore audio state after layout change
    if (activeStreamIndex !== -1) {
      setTimeout(() => {
        this.setActiveAudioStream(activeStreamIndex);
      }, 100);
    }

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

    // Update grid CSS based on layout
    const layoutStyles = {
      '2x2': {
        'grid-template-columns': '1fr 1fr',
        'grid-template-rows': '1fr 1fr',
        'gap': '8px'
      },
      '1+3': {
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
      } else {
        stream.style.display = 'none';
      }
    });

    console.log(`📐 UI: Grid layout updated to ${layout} with ${requiredStreams} streams`);
  }

  findActiveAudioStream() {
    const streams = document.querySelectorAll('.quadtv-stream');
    for (let i = 0; i < streams.length; i++) {
      if (streams[i].classList.contains('quadtv-audio-active')) {
        return i;
      }
    }
    return -1;
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

  onLayoutChanged(data) {
    console.log(`📐 Tab: Layout changed to ${data.layout}`, data);

    // Update current layout
    this.currentLayout = data.layout;

    // Show layout guidance notification for manual window arrangement
    if (data.layoutConfig) {
      this.showLayoutGuidance(data.layoutConfig);
    }

    // Preserve audio state during layout changes
    if (data.preserveAudio && data.preserveAudio.hasAudio) {
      setTimeout(() => {
        this.validateAudioState();
      }, 100);
    }
  }

  showLayoutGuidance(layoutConfig) {
    // Show a temporary notification with layout instructions
    const notification = document.createElement('div');
    notification.className = 'quadtv-layout-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <h4>📐 ${layoutConfig.description}</h4>
        <p>${layoutConfig.instructions}</p>
        <small>This notification will disappear in 5 seconds</small>
      </div>
    `;

    // Add styles for the notification
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 16px;
      border-radius: 8px;
      border: 2px solid #ff0000;
      max-width: 300px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    `;

    notification.querySelector('.notification-content').style.cssText = `
      margin: 0;
    `;

    notification.querySelector('h4').style.cssText = `
      margin: 0 0 8px 0;
      font-size: 16px;
      color: #ff0000;
    `;

    notification.querySelector('p').style.cssText = `
      margin: 0 0 8px 0;
      font-size: 14px;
      line-height: 1.4;
    `;

    notification.querySelector('small').style.cssText = `
      color: #ccc;
      font-size: 12px;
    `;

    document.body.appendChild(notification);

    // Remove notification after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
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