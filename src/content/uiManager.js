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
    this.messageProtocol = new window.QuadTVMessageProtocol();
    this.iframes = []; // Store iframe references for postMessage communication
    this.iframeBridge = null; // Bridge for cross-origin iframe communication
    this.init();
  }

  init() {
    this.setupMessageBusListeners();
    this.setupMessageProtocol();
  }

  setupMessageProtocol() {
    // Initialize postMessage handling
    this.messageProtocol.init();

    // Handle messages from iframes
    this.messageProtocol.onMessage('IFRAME_READY', (payload, message) => {
      console.log(`📨 Iframe ${payload.streamIndex} ready`);
      this.onIframeReady(payload.streamIndex);
    });

    this.messageProtocol.onMessage('AUDIO_STATE_CHANGED', (payload, message) => {
      console.log(`📨 Audio state changed in iframe ${payload.streamIndex}: ${payload.hasAudio}`);
      this.onIframeAudioChanged(payload.streamIndex, payload.hasAudio);
    });

    this.messageProtocol.onMessage('USER_CLICKED_STREAM', (payload, message) => {
      console.log(`📨 User clicked stream ${payload.streamIndex}`);
      this.setActiveAudioStream(payload.streamIndex);
    });

    this.messageProtocol.onMessage('VIDEO_FOUND', (payload, message) => {
      console.log(`📨 Video element found in iframe ${payload.streamIndex}`);
      this.onIframeVideoFound(payload.streamIndex);
    });

    this.messageProtocol.onMessage('VIDEO_LOST', (payload, message) => {
      console.log(`📨 Video element lost in iframe ${payload.streamIndex}`);
      this.onIframeVideoLost(payload.streamIndex);
    });

    console.log('📨 UIManager: MessageProtocol setup complete');
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

    // Initialize iframe bridge for cross-origin communication
    this.initializeIframeBridge();

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
    iframe.dataset.streamIndex = index;

    // Store iframe reference for postMessage communication
    this.iframes[index] = iframe;

    // Setup iframe load event for content script injection
    iframe.addEventListener('load', () => {
      this.onIframeLoaded(iframe, index);
    });

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

  async setActiveAudioStream(index) {
    const previousActiveStream = this.activeAudioStream;

    // Update internal state
    this.activeAudioStream = index;

    // Update visual indicators
    this.updateAudioIndicators();

    // Send audio state updates to all iframes
    for (let i = 0; i < this.iframes.length; i++) {
      const hasAudio = (i === index);
      await this.sendAudioStateToIframe(i, hasAudio);
    }

    console.log(`🔊 Audio switched from stream ${previousActiveStream} to stream ${index}`);
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

  // QTV-025: PostMessage Infrastructure Methods

  async onIframeLoaded(iframe, index) {
    console.log(`📺 Iframe ${index} loaded, will initialize via bridge...`);

    // The iframe bridge will handle communication once iframes are registered
    // Give iframe time to load YouTube TV content
    setTimeout(() => {
      this.checkIframeReadiness(iframe, index);
    }, 3000);
  }

  async injectContentScript(iframe, index) {
    try {
      console.log(`📺 Injecting content script into iframe ${index}...`);

      // Request content script injection via background script
      const response = await browser.runtime.sendMessage({
        type: 'INJECT_IFRAME_SCRIPT',
        iframeSrc: iframe.src,
        streamIndex: index
      });

      if (response?.success) {
        console.log(`✅ Content script injected into iframe ${index}`);

        // Now check readiness
        setTimeout(() => {
          this.checkIframeReadiness(iframe, index);
        }, 1000);
      } else {
        console.warn(`❌ Failed to inject content script into iframe ${index}:`, response?.error);

        // Fallback: try direct postMessage injection
        this.fallbackScriptInjection(iframe, index);
      }
    } catch (error) {
      console.error(`❌ Error injecting content script into iframe ${index}:`, error);

      // Fallback approach
      this.fallbackScriptInjection(iframe, index);
    }
  }

  fallbackScriptInjection(iframe, index) {
    console.log(`📺 Attempting fallback script injection for iframe ${index}...`);

    // Try to inject script content directly via postMessage
    const scriptContent = this.getIframeScriptContent();

    try {
      iframe.contentWindow.postMessage({
        type: 'QUADTV_INJECT_SCRIPT',
        scriptContent: scriptContent,
        streamIndex: index
      }, 'https://tv.youtube.com');

      console.log(`📨 Sent script injection message to iframe ${index}`);

      // Check readiness after injection
      setTimeout(() => {
        this.checkIframeReadiness(iframe, index);
      }, 1500);
    } catch (error) {
      console.error(`❌ Fallback injection failed for iframe ${index}:`, error);
    }
  }

  getIframeScriptContent() {
    // Return the iframe content script as a string for injection
    // This is a simplified version for fallback
    return `
      if (!window.quadTVIframeManager && window.QuadTVMessageProtocol) {
        console.log('📺 QuadTV: Fallback script injection...');

        // Basic iframe management
        const manager = {
          messageProtocol: new window.QuadTVMessageProtocol(),
          streamIndex: null,
          hasAudio: false,

          init() {
            this.messageProtocol.init();
            this.setupHandlers();
            this.notifyReady();
          },

          setupHandlers() {
            this.messageProtocol.onMessage('IFRAME_READY_CHECK', (payload) => {
              this.streamIndex = payload.streamIndex;
              this.notifyReady();
            });

            this.messageProtocol.onMessage('SET_AUDIO_STATE', (payload) => {
              this.setAudioState(payload.hasAudio);
            });
          },

          setAudioState(hasAudio) {
            const video = document.querySelector('video');
            if (video) {
              video.muted = !hasAudio;
              this.hasAudio = hasAudio;
              this.notifyAudioChanged();
            }
          },

          notifyReady() {
            this.messageProtocol.sendToParent('IFRAME_READY', {
              streamIndex: this.streamIndex,
              hasVideo: !!document.querySelector('video')
            });
          },

          notifyAudioChanged() {
            this.messageProtocol.sendToParent('AUDIO_STATE_CHANGED', {
              streamIndex: this.streamIndex,
              hasAudio: this.hasAudio
            });
          }
        };

        manager.init();
        window.quadTVIframeManager = manager;
      }
    `;
  }

  async checkIframeReadiness(iframe, index) {
    if (this.iframeBridge) {
      // Use iframe bridge to check readiness
      this.iframeBridge.sendToIframe(index, 'IFRAME_READY_CHECK', { streamIndex: index });
      console.log(`📨 Sent readiness check to iframe ${index} via bridge`);
    } else {
      console.warn(`📨 IframeBridge not available, skipping readiness check for iframe ${index}`);
    }
  }

  onIframeReady(streamIndex) {
    console.log(`✅ Iframe ${streamIndex} is ready for communication`);

    // Send initial audio state
    const hasAudio = this.activeAudioStream === streamIndex;
    this.sendAudioStateToIframe(streamIndex, hasAudio);
  }

  onIframeAudioChanged(streamIndex, hasAudio) {
    console.log(`🔊 Iframe ${streamIndex} audio state: ${hasAudio}`);

    // Update visual indicators
    this.updateAudioIndicators();
  }

  onIframeVideoFound(streamIndex) {
    console.log(`📺 Video element available in iframe ${streamIndex}`);

    // Remove loading state if present
    const stream = document.querySelector(`[data-stream-index="${streamIndex}"]`);
    if (stream) {
      stream.classList.remove('loading');
    }
  }

  onIframeVideoLost(streamIndex) {
    console.log(`⚠️ Video element lost in iframe ${streamIndex}`);

    // Add loading state
    const stream = document.querySelector(`[data-stream-index="${streamIndex}"]`);
    if (stream) {
      stream.classList.add('loading');
    }
  }

  initializeIframeBridge() {
    if (window.QuadTVIframeBridge) {
      this.iframeBridge = new window.QuadTVIframeBridge();

      // Give iframes time to load, then register them
      setTimeout(() => {
        console.log(`📺 Registering ${this.iframes.length} iframes with bridge`);
        this.iframeBridge.registerIframes(this.iframes);
      }, 2000);

      console.log('📺 IframeBridge initialized');
    } else {
      console.error('📺 IframeBridge not available');
    }
  }

  async sendAudioStateToIframe(streamIndex, hasAudio) {
    if (this.iframeBridge) {
      // Use iframe bridge for cross-origin communication
      this.iframeBridge.sendToIframe(streamIndex, 'SET_AUDIO_STATE', {
        streamIndex,
        hasAudio
      });
      console.log(`📨 Sent audio state ${hasAudio} to iframe ${streamIndex} via bridge`);
    } else {
      // Fallback to direct postMessage (might not work for cross-origin)
      const iframe = this.iframes[streamIndex];
      if (!iframe) {
        console.warn(`No iframe reference for stream ${streamIndex}`);
        return;
      }

      try {
        await this.messageProtocol.sendToIframe(
          iframe,
          'SET_AUDIO_STATE',
          { streamIndex, hasAudio },
          false
        );
        console.log(`📨 Sent audio state ${hasAudio} to iframe ${streamIndex}`);
      } catch (error) {
        console.error(`Failed to send audio state to iframe ${streamIndex}:`, error);
      }
    }
  }

  updateAudioIndicators() {
    // Update visual indicators based on current audio state
    const streams = document.querySelectorAll('.quadtv-stream');
    streams.forEach((stream, index) => {
      const isActive = this.activeAudioStream === index;
      stream.classList.toggle('quadtv-audio-active', isActive);
    });
  }

  setLayout(layout) {
    console.log(`📐 UI: Setting layout to ${layout}`);
    this.currentLayout = layout;

    if (!this.isActive) {
      console.log('📐 UI: QuadTV not active, storing layout preference');
      return;
    }

    console.log(`📐 UI: Applying layout ${layout} to ${this.isActive ? 'active' : 'inactive'} QuadTV`);

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
    console.log(`📐 UI: Set data-layout="${layout}" on grid container`);

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
        console.log(`📐 UI: Showing stream ${index}`);
      } else {
        stream.style.display = 'none';
        console.log(`📐 UI: Hiding stream ${index}`);
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

    // Apply the visual layout changes
    this.updateGridLayout(data.layout);

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