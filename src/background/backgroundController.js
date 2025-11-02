class BackgroundController {
  constructor() {
    this.isActive = false;
    this.currentLayout = '2x2'; // Default layout
    this.init();
  }

  init() {
    this.setupBrowserActionListener();
    this.setupMessageListener();
  }

  setupBrowserActionListener() {
    browser.browserAction.onClicked.addListener((tab) => {
      this.toggleQuadTV(tab);
    });
  }

  setupMessageListener() {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
  }

  async toggleQuadTV(tab) {
    console.log('🚀 Background: Toggle QuadTV requested', { tabId: tab.id, url: tab.url });

    // Only activate on YouTube TV pages
    if (!tab.url || !tab.url.includes('tv.youtube.com')) {
      console.log('❌ Background: Not a YouTube TV page');
      browser.browserAction.setBadgeText({ text: '❌', tabId: tab.id });
      return;
    }

    try {
      if (this.isActive) {
        await this.deactivateQuadTV(tab);
      } else {
        await this.activateQuadTV(tab);
      }
    } catch (error) {
      console.error('❌ Background: Toggle failed:', error);
      browser.browserAction.setBadgeText({ text: '❌', tabId: tab.id });
    }
  }

  async activateQuadTV(tab) {
    console.log('🚀 Background: Activating QuadTV on tab', tab.id);
    console.log('🔍 Background: Tab URL:', tab.url);

    try {
      // Check if user is currently watching a video
      let currentVideoUrl = null;
      if (tab.url && tab.url.includes('/watch/')) {
        currentVideoUrl = tab.url;
        console.log('📺 Background: User is watching:', currentVideoUrl);
      } else {
        console.log('📺 Background: Not watching a video (no /watch/ in URL)');
      }

      // Send activation message to content script
      console.log('📤 Background: Sending message with currentVideoUrl:', currentVideoUrl);
      await browser.tabs.sendMessage(tab.id, {
        type: 'ACTIVATE_QUADTV',
        layout: this.currentLayout,
        currentVideoUrl: currentVideoUrl
      });

      this.isActive = true;

      // Update browser action icon
      browser.browserAction.setBadgeText({ text: '✓', tabId: tab.id });
      browser.browserAction.setBadgeBackgroundColor({ color: '#00ff00' });

      console.log('✅ Background: QuadTV activated successfully');

    } catch (error) {
      console.error('❌ Background: Failed to activate QuadTV:', error);
      browser.browserAction.setBadgeText({ text: '❌', tabId: tab.id });
      throw error;
    }
  }

  async deactivateQuadTV(tab) {
    console.log('🔄 Background: Deactivating QuadTV');

    try {
      // Send deactivation message to content script
      await browser.tabs.sendMessage(tab.id, {
        type: 'DEACTIVATE_QUADTV'
      });

      this.isActive = false;

      // Update browser action icon
      browser.browserAction.setBadgeText({ text: '', tabId: tab.id });

      console.log('✅ Background: QuadTV deactivated successfully');
      
    } catch (error) {
      console.error('❌ Background: Failed to deactivate QuadTV:', error);
      // Still mark as inactive even if content script communication fails
      this.isActive = false;
      browser.browserAction.setBadgeText({ text: '', tabId: tab.id });
    }
  }

  async handleMessage(message, sender, sendResponse) {
    console.log('📨 Background: Received message', message.type);

    switch (message.type) {
      case 'GET_STATE':
        console.log('📊 Background: GET_STATE called, isActive:', this.isActive);
        sendResponse({
          isActive: this.isActive,
          currentLayout: this.currentLayout
        });
        break;

      case 'SET_LAYOUT':
        await this.setLayout(message.layout, sender.tab);
        sendResponse({ success: true });
        break;

      case 'QUADTV_READY':
        // Content script is ready - update icon
        if (this.isActive) {
          browser.browserAction.setBadgeText({ text: '✓', tabId: sender.tab.id });
        }
        sendResponse({ success: true });
        break;

      case 'RESET_GRID':
        // Reset grid sizing to defaults
        try {
          const tabs = await browser.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]) {
            await browser.tabs.sendMessage(tabs[0].id, { type: 'RESET_GRID' });
          }
          sendResponse({ success: true });
        } catch (error) {
          console.error('Failed to reset grid:', error);
          sendResponse({ success: false });
        }
        break;

      case 'UI_STATE_CHANGED':
        console.log('📊 Background: UI_STATE_CHANGED, isActive:', message.isActive);
        this.isActive = message.isActive;
        sendResponse({ success: true });
        break;

      default:
        console.log('❓ Background: Unknown message type', message.type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  async setLayout(layoutType, tab) {
    console.log(`📐 Background: Setting layout to ${layoutType}`);
    
    this.currentLayout = layoutType;

    // Send layout change to content script
    try {
      await browser.tabs.sendMessage(tab.id, {
        type: 'SET_LAYOUT',
        layout: layoutType
      });
      console.log(`✅ Background: Layout set to ${layoutType}`);
    } catch (error) {
      console.error(`❌ Background: Failed to set layout:`, error);
    }
  }
}

// Initialize background controller
const backgroundController = new BackgroundController();
console.log('🚀 Background: QuadTV Background Controller initialized');