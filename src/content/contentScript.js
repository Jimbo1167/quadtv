class QuadTVContentScript {
  constructor() {
    this.isActive = false;
    this.messageBus = window.QuadTVMessageBus;
    this.init();
  }

  init() {
    this.setupMessageListener();
    this.setupMessageBusListeners();
    this.notifyBackgroundReady();
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
      console.log('📺 Content: UI activated');
      // Notify background that UI is now active
      browser.runtime.sendMessage({ type: 'UI_STATE_CHANGED', isActive: true })
        .catch(err => console.error('Failed to notify background:', err));
    });

    this.messageBus.subscribe('UI_DEACTIVATED', () => {
      this.isActive = false;
      console.log('📺 Content: UI deactivated');
      // Notify background that UI is now inactive
      browser.runtime.sendMessage({ type: 'UI_STATE_CHANGED', isActive: false })
        .catch(err => console.error('Failed to notify background:', err));
    });
  }

  async notifyBackgroundReady() {
    try {
      await browser.runtime.sendMessage({ type: 'QUADTV_READY' });
    } catch (error) {
      console.error('Failed to notify background readiness:', error);
    }
  }

  handleBackgroundMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'ACTIVATE_QUADTV':
        this.activateQuadTV(message.layout);
        sendResponse({ success: true });
        break;

      case 'DEACTIVATE_QUADTV':
        this.deactivateQuadTV();
        sendResponse({ success: true });
        break;

      case 'SET_LAYOUT':
        console.log(`📐 Content: Layout changed to ${message.layout}`);
        this.messageBus.publish('SET_LAYOUT', { layout: message.layout });
        sendResponse({ success: true });
        break;

      case 'GET_STATE':
        sendResponse({
          isActive: this.isActive
        });
        break;

      case 'RESET_GRID':
        console.log('📏 Content: Resetting grid sizing');
        this.messageBus.publish('RESET_GRID');
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  activateQuadTV(layout) {
    console.log('📺 Content: Activating QuadTV iframe grid');
    
    // Activate the iframe-based UI
    this.messageBus.publish('QUADTV_ACTIVATED', {
      layout: layout || '2x2'
    });
  }

  deactivateQuadTV() {
    console.log('📺 Content: Deactivating QuadTV iframe grid');
    
    // Deactivate the iframe-based UI
    this.messageBus.publish('QUADTV_DEACTIVATED');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new QuadTVContentScript();
  });
} else {
  new QuadTVContentScript();
}