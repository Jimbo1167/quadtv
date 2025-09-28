class BackgroundController {
  constructor() {
    this.activeTabStates = new Map();
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
    } catch (error) {
      console.error('Failed to send message to content script:', error);
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