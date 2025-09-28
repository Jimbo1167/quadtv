class StreamManager {
  constructor() {
    this.streamTabs = new Map(); // Map<streamIndex, tabId>
    this.activeAudioTab = null;
    this.currentStreamIndex = null;
    this.messageBus = window.QuadTVMessageBus;
    this.storageManager = window.QuadTVStorageManager;
    this.init();
  }

  init() {
    this.setupMessageBusListeners();
  }

  setupMessageBusListeners() {
    this.messageBus.subscribe('QUADTV_ACTIVATED', (data) => this.onQuadTVActivated(data));
    this.messageBus.subscribe('QUADTV_DEACTIVATED', () => this.onQuadTVDeactivated());
    this.messageBus.subscribe('AUDIO_CHANGED', (data) => this.onAudioChanged(data));
    this.messageBus.subscribe('SET_AUDIO_STATE', (data) => this.setAudioState(data));
    this.messageBus.subscribe('LOAD_PRESET', (data) => this.loadPreset(data.preset));
  }

  onQuadTVActivated(data) {
    console.log('🎬 StreamManager: QuadTV activated', data);

    // Store tab mapping and state
    this.streamTabs = new Map(data.streamTabs);
    this.activeAudioTab = data.activeAudioTab;

    // Determine which stream this tab represents
    const currentTabId = this.getCurrentTabId();
    for (const [streamIndex, tabId] of this.streamTabs.entries()) {
      if (tabId === currentTabId) {
        this.currentStreamIndex = streamIndex;
        break;
      }
    }

    console.log(`🎬 This tab is stream ${this.currentStreamIndex}`);
  }

  onQuadTVDeactivated() {
    console.log('🎬 StreamManager: QuadTV deactivated');
    this.streamTabs.clear();
    this.activeAudioTab = null;
    this.currentStreamIndex = null;
  }

  onAudioChanged(data) {
    console.log('🎬 StreamManager: Audio changed to tab', data.activeAudioTab);
    this.activeAudioTab = data.activeAudioTab;
  }

  setAudioState(data) {
    console.log(`🎬 StreamManager: Setting audio ${data.hasAudio ? 'ON' : 'OFF'} for stream ${data.streamIndex}`);
    // Audio control is handled by UIManager, this is for coordination
  }

  getCurrentTabId() {
    return window.quadTVCurrentTabId;
  }

  // Multi-tab approach: streams are managed at the browser tab level
  // Each tab contains its own YouTube TV content
  getStreamCount() {
    return this.streamTabs.size;
  }

  getCurrentStreamIndex() {
    return this.currentStreamIndex;
  }

  isAudioActiveForThisTab() {
    const currentTabId = this.getCurrentTabId();
    return currentTabId === this.activeAudioTab;
  }

  // Audio switching is now handled by background script through browser tab API
  requestAudioSwitch(streamIndex) {
    console.log(`🎬 StreamManager: Requesting audio switch to stream ${streamIndex}`);

    // Send message to background script to handle audio switching
    browser.runtime.sendMessage({
      type: 'SWITCH_AUDIO',
      streamIndex: streamIndex
    }).catch(error => {
      console.error('Failed to request audio switch:', error);
    });
  }

  // In multi-tab approach, each tab navigates independently
  // URL changes are handled by YouTube TV's own navigation
  async navigateToUrl(url) {
    if (!this.isValidYouTubeTVUrl(url)) {
      console.error('Invalid YouTube TV URL:', url);
      return false;
    }

    console.log(`🎬 StreamManager: Navigating to ${url}`);
    window.location.href = url;
    return true;
  }

  // Focus in multi-tab approach means bringing tab to front
  focusThisTab() {
    // This would be handled by background script focusing the tab
    browser.runtime.sendMessage({
      type: 'FOCUS_TAB',
      streamIndex: this.currentStreamIndex
    }).catch(error => {
      console.error('Failed to focus tab:', error);
    });
  }

  // Channel selection can be done through YouTube TV's native interface
  openChannelSelector() {
    // Navigate to YouTube TV browse page for channel selection
    this.navigateToUrl('https://tv.youtube.com/browse');
  }

  // Preset saving in multi-tab approach requires coordination with background
  async saveAsPreset(name) {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'SAVE_PRESET',
        name: name
      });

      if (response.success) {
        this.messageBus.publish('PRESET_SAVED', { name, preset: response.preset });
      }
      return response.success;
    } catch (error) {
      console.error('Failed to save preset:', error);
      return false;
    }
  }

  // Preset loading in multi-tab approach requires background coordination
  async loadPreset(presetName) {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'LOAD_PRESET',
        name: presetName
      });

      if (response.success) {
        this.messageBus.publish('PRESET_LOADED', { name: presetName, preset: response.preset });
      }
      return response.success;
    } catch (error) {
      console.error('Failed to load preset:', error);
      return false;
    }
  }

  isValidYouTubeTVUrl(url) {
    return url && url.includes('tv.youtube.com');
  }

  getStreamData() {
    return {
      streamTabs: Array.from(this.streamTabs.entries()),
      activeAudioTab: this.activeAudioTab,
      currentStreamIndex: this.currentStreamIndex
    };
  }

  // Get information about this tab's role in the multi-tab setup
  getTabInfo() {
    return {
      streamIndex: this.currentStreamIndex,
      isAudioActive: this.isAudioActiveForThisTab(),
      totalStreams: this.getStreamCount()
    };
  }
}

window.QuadTVStreamManager = new StreamManager();