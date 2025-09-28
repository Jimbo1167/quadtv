// QuadTV Prototype - Content Script
// Handles YouTube TV tab behavior and audio management

class QuadTVTabManager {
  constructor() {
    this.isQuadTVActive = false;
    this.hasAudio = true; // Default: tab has audio
    this.streamIndex = null;
    this.indicator = null;

    this.init();
  }

  async init() {
    console.log('🧪 QuadTV Tab Manager initialized on:', window.location.href);

    // Listen for messages from background script
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

    // Get initial state from background
    try {
      const state = await browser.runtime.sendMessage({ type: 'GET_STATE' });
      this.updateFromState(state);
    } catch (error) {
      console.error('❌ Failed to get initial state:', error);
    }

    // Notify background that this tab is ready
    this.notifyReady();
  }

  async notifyReady() {
    try {
      await browser.runtime.sendMessage({ type: 'TAB_READY' });
    } catch (error) {
      console.error('❌ Failed to notify ready:', error);
    }
  }

  handleMessage(message, sender, sendResponse) {
    console.log('📩 Tab received message:', message.type);

    switch (message.type) {
      case 'QUADTV_ACTIVATED':
        this.onQuadTVActivated(message);
        sendResponse({ success: true });
        break;

      case 'QUADTV_DEACTIVATED':
        this.onQuadTVDeactivated();
        sendResponse({ success: true });
        break;

      case 'SET_AUDIO_STATE':
        this.setAudioState(message.hasAudio, message.streamIndex);
        sendResponse({ success: true });
        break;

      case 'AUDIO_CHANGED':
        this.onAudioChanged(message);
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  onQuadTVActivated(data) {
    console.log('🚀 Tab: QuadTV activated');
    this.isQuadTVActive = true;

    // Find this tab's stream index
    const currentTabId = this.getCurrentTabId();
    const streamEntry = data.streamTabs.find(([index, tabId]) => tabId === currentTabId);

    if (streamEntry) {
      this.streamIndex = streamEntry[0];
      console.log(`📺 This tab is stream ${this.streamIndex}`);
    }

    this.createIndicator();
    this.showQuadTVControls();
  }

  onQuadTVDeactivated() {
    console.log('🛑 Tab: QuadTV deactivated');
    this.isQuadTVActive = false;
    this.streamIndex = null;

    this.removeIndicator();
    this.hideQuadTVControls();
    this.restoreAudio();
  }

  setAudioState(hasAudio, streamIndex) {
    console.log(`🔊 Tab: Setting audio ${hasAudio ? 'ON' : 'OFF'} (stream ${streamIndex})`);

    this.hasAudio = hasAudio;
    this.streamIndex = streamIndex;

    if (hasAudio) {
      this.enableAudio();
    } else {
      this.muteAudio();
    }

    this.updateIndicator();
  }

  onAudioChanged(data) {
    const isActiveTab = this.getCurrentTabId() === data.activeAudioTab;
    console.log(`🔊 Audio changed: This tab ${isActiveTab ? 'IS' : 'is NOT'} the active audio tab`);

    this.hasAudio = isActiveTab;
    this.updateIndicator();
  }

  enableAudio() {
    // Try multiple methods to unmute YouTube TV
    this.setVideoElementsAudio(false); // unmute
    this.setPageAudio(false); // unmute page
    console.log('🔊 Audio enabled for this tab');
  }

  muteAudio() {
    // Try multiple methods to mute YouTube TV
    this.setVideoElementsAudio(true); // mute
    this.setPageAudio(true); // mute page
    console.log('🔇 Audio muted for this tab');
  }

  restoreAudio() {
    // Restore normal audio behavior
    this.setVideoElementsAudio(false); // unmute
    this.setPageAudio(false); // unmute
    console.log('🔊 Audio restored to normal');
  }

  setVideoElementsAudio(muted) {
    // Find and mute/unmute all video elements
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      video.muted = muted;
    });

    // Also try to find YouTube TV specific elements
    const yttvVideos = document.querySelectorAll('[data-layer="player"] video');
    yttvVideos.forEach(video => {
      video.muted = muted;
    });
  }

  setPageAudio(muted) {
    // Try to control page-level audio using Web Audio API if available
    try {
      if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        // This is more complex and may not work for all cases
        // For prototype, we'll rely on video element muting
      }
    } catch (error) {
      // Ignore audio context errors for prototype
    }
  }

  createIndicator() {
    if (this.indicator) return;

    this.indicator = document.createElement('div');
    this.indicator.id = 'quadtv-indicator';
    this.indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 10000;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 12px;
      border: 2px solid #333;
      cursor: pointer;
    `;

    this.updateIndicator();

    // Add click handler for audio switching
    this.indicator.addEventListener('click', () => {
      this.requestAudioSwitch();
    });

    document.body.appendChild(this.indicator);
  }

  updateIndicator() {
    if (!this.indicator) return;

    const audioStatus = this.hasAudio ? '🔊 AUDIO' : '🔇 MUTED';
    const streamLabel = this.streamIndex !== null ? `Stream ${this.streamIndex}` : 'QuadTV';

    this.indicator.textContent = `${streamLabel} - ${audioStatus}`;
    this.indicator.style.borderColor = this.hasAudio ? '#ff0000' : '#333';
    this.indicator.style.background = this.hasAudio ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.8)';
  }

  removeIndicator() {
    if (this.indicator) {
      this.indicator.remove();
      this.indicator = null;
    }
  }

  async requestAudioSwitch() {
    if (this.streamIndex === null) return;

    console.log(`🔊 Requesting audio switch to stream ${this.streamIndex}`);

    try {
      await browser.runtime.sendMessage({
        type: 'SWITCH_AUDIO',
        streamIndex: this.streamIndex
      });
    } catch (error) {
      console.error('❌ Failed to switch audio:', error);
    }
  }

  showQuadTVControls() {
    // Add any visual indicators that QuadTV is active
    document.body.style.boxShadow = 'inset 0 0 0 3px rgba(255, 0, 0, 0.3)';
  }

  hideQuadTVControls() {
    // Remove QuadTV visual indicators
    document.body.style.boxShadow = '';
  }

  getCurrentTabId() {
    // This is a simplified way to identify tab ID
    // In practice, the background script tells us our tab ID
    return parseInt(Math.random() * 1000000); // Placeholder for prototype
  }

  updateFromState(state) {
    if (state.isActive) {
      this.isQuadTVActive = true;
      this.createIndicator();
      this.showQuadTVControls();
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new QuadTVTabManager();
  });
} else {
  new QuadTVTabManager();
}

console.log('🧪 QuadTV prototype content script loaded');