class QuadTVContentScript {
  constructor() {
    this.isActive = false;
    this.messageBus = window.QuadTVMessageBus;
    this.init();
  }

  init() {
    this.setupMessageListener();
    this.setupMessageBusListeners();
    this.checkInitialState();
  }

  setupMessageListener() {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleBackgroundMessage(message, sender, sendResponse);
      return true;
    });
  }

  setupMessageBusListeners() {
    this.messageBus.subscribe('UI_ACTIVATED', () => {
      this.isActive = true;
      this.notifyBackgroundState(true);
    });

    this.messageBus.subscribe('UI_DEACTIVATED', () => {
      this.isActive = false;
      this.notifyBackgroundState(false);
    });

    // Forward tab-related messages to background
    this.messageBus.subscribe('LAYOUT_CHANGED', (data) => {
      browser.runtime.sendMessage({
        type: 'LAYOUT_CHANGED',
        layout: data.layout
      }).catch(error => console.error('Failed to notify layout change:', error));
    });
  }

  async checkInitialState() {
    try {
      // Notify background that this tab is ready
      await browser.runtime.sendMessage({ type: 'TAB_READY' });

      // Check if QuadTV is already active in multi-tab mode
      const response = await browser.runtime.sendMessage({ type: 'GET_STATE' });
      if (response?.isActive) {
        console.log('📺 Content: QuadTV already active, synchronizing state');
        this.messageBus.publish('QUADTV_ACTIVATED', {
          streamTabs: response.streamTabs,
          activeAudioTab: response.activeAudioTab
        });
      }
    } catch (error) {
      console.error('Failed to get initial state:', error);
    }
  }

  handleBackgroundMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'ACTIVATE_QUADTV':
        this.activateQuadTV();
        sendResponse({ success: true });
        break;

      case 'DEACTIVATE_QUADTV':
        this.deactivateQuadTV();
        sendResponse({ success: true });
        break;

      case 'GET_TAB_STATE':
        sendResponse({ 
          isQuadTVTab: this.isActive,
          tabId: window.quadTVCurrentTabId 
        });
        break;

      case 'QUADTV_ACTIVATED':
        console.log('📺 Content: Received QuadTV activation with multi-tab data');
        this.messageBus.publish('QUADTV_ACTIVATED', message);
        sendResponse({ success: true });
        break;

      case 'QUADTV_DEACTIVATED':
        console.log('📺 Content: Received QuadTV deactivation');
        this.messageBus.publish('QUADTV_DEACTIVATED');
        sendResponse({ success: true });
        break;

      case 'AUDIO_CHANGED':
        console.log('🔊 Content: Audio changed', message);
        this.messageBus.publish('AUDIO_CHANGED', message);
        sendResponse({ success: true });
        break;

      case 'SET_AUDIO_STATE':
        console.log(`🔊 Content: Set audio state ${message.hasAudio ? 'ON' : 'OFF'}`);
        this.messageBus.publish('SET_AUDIO_STATE', message);
        sendResponse({ success: true });
        break;

      case 'LAYOUT_CHANGED':
        console.log(`📐 Content: Layout changed to ${message.layout}`);
        this.messageBus.publish('LAYOUT_CHANGED', message);
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  activateQuadTV() {
    console.log('📺 Content: Activating QuadTV - requesting background coordination');
    
    // Send message to background script to start multi-tab coordination
    browser.runtime.sendMessage({
      type: 'TOGGLE_QUADTV'
    }).then(response => {
      console.log('📺 Content: Background activation response:', response);
    }).catch(error => {
      console.error('📺 Content: Failed to activate QuadTV:', error);
    });
  }

  deactivateQuadTV() {
    console.log('📺 Content: Deactivating QuadTV - requesting background coordination');
    
    // Send message to background script to stop multi-tab coordination
    browser.runtime.sendMessage({
      type: 'TOGGLE_QUADTV'
    }).then(response => {
      console.log('📺 Content: Background deactivation response:', response);
    }).catch(error => {
      console.error('📺 Content: Failed to deactivate QuadTV:', error);
    });
  }

  notifyBackgroundState(isActive) {
    browser.runtime.sendMessage({
      type: 'UPDATE_TAB_STATE',
      isActive: isActive
    }).catch(error => {
      console.error('Failed to update background state:', error);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new QuadTVContentScript();
  });
} else {
  new QuadTVContentScript();
}