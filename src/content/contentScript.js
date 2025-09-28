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
  }

  async checkInitialState() {
    try {
      const response = await browser.runtime.sendMessage({ type: 'GET_TAB_STATE' });
      if (response?.isActive) {
        this.activateQuadTV();
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

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  activateQuadTV() {
    if (this.isActive) return;

    console.log('Activating QuadTV');
    this.messageBus.publish('ACTIVATE_UI');
  }

  deactivateQuadTV() {
    if (!this.isActive) return;

    console.log('Deactivating QuadTV');
    this.messageBus.publish('DEACTIVATE_UI');
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