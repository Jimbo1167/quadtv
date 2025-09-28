class BackgroundController {
  constructor() {
    this.activeTabStates = new Map();
    this.init();
  }

  init() {
    this.setupBrowserActionListener();
    this.setupCommandListener();
    this.setupMessageListener();
    this.setupTabListeners();
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

  setupTabListeners() {
    // Update icon state when tabs are activated
    browser.tabs.onActivated.addListener(async (activeInfo) => {
      await this.updateIconState(activeInfo.tabId);
    });

    // Update icon state when tab URL changes
    browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' || changeInfo.url) {
        await this.updateIconState(tabId);
      }
    });

    // Clean up state when tabs are closed
    browser.tabs.onRemoved.addListener((tabId) => {
      this.activeTabStates.delete(tabId);
    });
  }

  async updateIconState(tabId) {
    try {
      const tab = await browser.tabs.get(tabId);
      const isYouTubeTV = this.isYouTubeTV(tab.url);

      if (isYouTubeTV) {
        const isActive = this.activeTabStates.get(tabId) || false;
        await browser.browserAction.setIcon({
          tabId: tabId,
          path: {
            16: isActive ? "icons/icon-16-active.png" : "icons/icon-16.png",
            32: isActive ? "icons/icon-32-active.png" : "icons/icon-32.png"
          }
        });
        await browser.browserAction.setTitle({
          tabId: tabId,
          title: isActive ? "QuadTV: Active (Click to deactivate)" : "QuadTV: Click to activate"
        });
        await browser.browserAction.enable(tabId);
      } else {
        await browser.browserAction.setTitle({
          tabId: tabId,
          title: "QuadTV: Only available on YouTube TV"
        });
        await browser.browserAction.disable(tabId);
      }
    } catch (error) {
      console.error('Failed to update icon state:', error);
    }
  }

  async toggleQuadTV(tab) {
    if (!this.isYouTubeTV(tab.url)) {
      console.log('QuadTV can only be used on YouTube TV');
      return;
    }

    const isActive = this.activeTabStates.get(tab.id) || false;
    const newState = !isActive;

    this.activeTabStates.set(tab.id, newState);

    try {
      await browser.tabs.sendMessage(tab.id, {
        type: newState ? 'ACTIVATE_QUADTV' : 'DEACTIVATE_QUADTV'
      });

      // Update icon state after successful toggle
      await this.updateIconState(tab.id);
    } catch (error) {
      console.error('Failed to send message to content script:', error);
      // Reset state on error
      this.activeTabStates.set(tab.id, isActive);
    }
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'GET_TAB_STATE':
        const tabId = sender.tab?.id;
        const isActive = this.activeTabStates.get(tabId) || false;
        sendResponse({ isActive });
        break;

      case 'UPDATE_TAB_STATE':
        if (sender.tab?.id) {
          this.activeTabStates.set(sender.tab.id, message.isActive);
        }
        break;
    }
  }

  isYouTubeTV(url) {
    return url && url.includes('tv.youtube.com');
  }
}

new BackgroundController();