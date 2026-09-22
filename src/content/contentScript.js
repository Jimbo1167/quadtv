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

    this.messageBus.subscribe('LAYOUT_CHANGED', (data) => this.onLayoutChanged(data));

    this.messageBus.subscribe('UI_DEACTIVATED', () => {
      this.isActive = false;
      console.log('📺 Content: UI deactivated');
      // Notify background that UI is now inactive
      browser.runtime.sendMessage({ type: 'UI_STATE_CHANGED', isActive: false })
        .catch(err => console.error('Failed to notify background:', err));
    });
  }

  /**
   * A layout change made in-page (toolbar, L key, Ctrl+Space). Persist it so
   * the popup shows the right selection, and tell the background.
   * @param {{layout: string}} data
   */
  async onLayoutChanged(data) {
    const layout = data && data.layout;
    if (!layout) return;
    try {
      const storage = window.QuadTVStorageManager;
      if (storage) {
        const settings = await storage.getSettings();
        settings.lastLayout = layout;
        await storage.saveSettings(settings);
      }
      await browser.runtime.sendMessage({ type: 'LAYOUT_CHANGED', layout });
    } catch (error) {
      console.error('Failed to persist layout change:', error);
    }
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
        this.activateQuadTV(message.layout, message.currentVideoUrl);
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

  activateQuadTV(layout, currentVideoUrl) {
    console.log('📺 Content: Activating QuadTV iframe grid');
    console.log('📺 Content: Received currentVideoUrl:', currentVideoUrl);

    // Activate the iframe-based UI
    this.messageBus.publish('QUADTV_ACTIVATED', {
      layout: layout || '2x2',
      currentVideoUrl: currentVideoUrl
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