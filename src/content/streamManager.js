class StreamManager {
  constructor() {
    this.streams = [];
    this.activeAudioStream = 0;
    this.messageBus = window.QuadTVMessageBus;
    this.storageManager = window.QuadTVStorageManager;
    this.init();
  }

  init() {
    this.setupMessageBusListeners();
  }

  setupMessageBusListeners() {
    this.messageBus.subscribe('UI_ACTIVATED', () => this.onUIActivated());
    this.messageBus.subscribe('UI_DEACTIVATED', () => this.onUIDeactivated());
    this.messageBus.subscribe('STREAM_ACTION', (data) => this.handleStreamAction(data));
    this.messageBus.subscribe('LOAD_PRESET', (data) => this.loadPreset(data.preset));
  }

  onUIActivated() {
    this.initializeStreams();
    this.loadCurrentChannel();
  }

  onUIDeactivated() {
    this.streams = [];
    this.activeAudioStream = 0;
  }

  initializeStreams() {
    const streamCount = this.getStreamCount();
    this.streams = Array(streamCount).fill(null).map((_, index) => ({
      id: index,
      url: '',
      isLoaded: false,
      hasAudio: index === 0
    }));

    this.activeAudioStream = 0;
    this.messageBus.publish('HIGHLIGHT_STREAM', { streamIndex: 0 });
  }

  getStreamCount() {
    return 4;
  }

  async loadCurrentChannel() {
    const currentUrl = window.location.href;
    if (this.isValidYouTubeTVUrl(currentUrl)) {
      await this.setStreamUrl(0, currentUrl);
    }
  }

  handleStreamAction(data) {
    const { streamIndex, action } = data;

    switch (action) {
      case 'toggle-audio':
        this.setActiveAudio(streamIndex);
        break;
      case 'focus':
        this.focusStream(streamIndex);
        break;
      case 'change-channel':
        this.openChannelSelector(streamIndex);
        break;
    }
  }

  setActiveAudio(streamIndex) {
    if (streamIndex >= this.streams.length) return;

    this.streams.forEach((stream, index) => {
      stream.hasAudio = index === streamIndex;
    });

    this.activeAudioStream = streamIndex;
    this.messageBus.publish('HIGHLIGHT_STREAM', { streamIndex });
    this.messageBus.publish('AUDIO_CHANGED', { activeStream: streamIndex });
  }

  async setStreamUrl(streamIndex, url) {
    if (streamIndex >= this.streams.length) return false;

    if (!this.isValidYouTubeTVUrl(url)) {
      console.error('Invalid YouTube TV URL:', url);
      return false;
    }

    this.streams[streamIndex].url = url;
    this.streams[streamIndex].isLoaded = true;

    this.messageBus.publish('STREAM_URL_CHANGED', {
      streamIndex,
      url,
      stream: this.streams[streamIndex]
    });

    return true;
  }

  focusStream(streamIndex) {
    this.messageBus.publish('FOCUS_STREAM', { streamIndex });
  }

  openChannelSelector(streamIndex) {
    this.messageBus.publish('OPEN_CHANNEL_SELECTOR', { streamIndex });
  }

  async saveAsPreset(name) {
    const preset = {
      layout: this.getCurrentLayout(),
      streams: this.streams.map(stream => ({
        url: stream.url,
        isLoaded: stream.isLoaded
      })),
      activeAudioStream: this.activeAudioStream,
      timestamp: Date.now()
    };

    const success = await this.storageManager.savePreset(name, preset);
    if (success) {
      this.messageBus.publish('PRESET_SAVED', { name, preset });
    }
    return success;
  }

  async loadPreset(presetName) {
    const presets = await this.storageManager.getPresets();
    const preset = presets[presetName];

    if (!preset) {
      console.error('Preset not found:', presetName);
      return false;
    }

    this.messageBus.publish('SET_LAYOUT', { layout: preset.layout });

    setTimeout(() => {
      preset.streams.forEach((streamData, index) => {
        if (streamData.isLoaded && streamData.url) {
          this.setStreamUrl(index, streamData.url);
        }
      });

      this.setActiveAudio(preset.activeAudioStream);
    }, 100);

    this.messageBus.publish('PRESET_LOADED', { name: presetName, preset });
    return true;
  }

  getCurrentLayout() {
    return window.QuadTVUIManager?.currentLayout || '2x2';
  }

  isValidYouTubeTVUrl(url) {
    return url && url.includes('tv.youtube.com');
  }

  getStreamData() {
    return {
      streams: [...this.streams],
      activeAudioStream: this.activeAudioStream
    };
  }
}

window.QuadTVStreamManager = new StreamManager();