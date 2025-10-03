class BackgroundController {
  constructor() {
    this.isActive = false;
    this.currentLayout = '2x2'; // Default layout
    this.init();
  }

  init() {
    this.setupBrowserActionListener();
    this.setupCommandListener();
    this.setupMessageListener();
  }

  setupBrowserActionListener() {
    browser.browserAction.onClicked.addListener((tab) => {
      this.toggleQuadTV(tab);
    });
  }

  setupCommandListener() {
    browser.commands.onCommand.addListener((command) => {
      if (command === 'toggle-quadtv') {
        browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            this.toggleQuadTV(tabs[0]);
          }
        });
      }
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

    try {
      // Send activation message to content script
      await browser.tabs.sendMessage(tab.id, {
        type: 'ACTIVATE_QUADTV',
        layout: this.currentLayout
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