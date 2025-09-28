// QuadTV Prototype - Background Script
// Tests multi-tab coordination approach

class QuadTVPrototype {
  constructor() {
    this.streamTabs = new Map(); // Map<streamIndex, tabId>
    this.activeAudioTab = null;
    this.controlTabId = null;
    this.isActive = false;

    this.init();
  }

  init() {
    // Listen for toolbar clicks
    browser.browserAction.onClicked.addListener((tab) => {
      this.handleToolbarClick(tab);
    });

    // Listen for messages from content scripts
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

    // Clean up when tabs are closed
    browser.tabs.onRemoved.addListener((tabId) => {
      this.handleTabClosed(tabId);
    });
  }

  async handleToolbarClick(tab) {
    console.log('🧪 Prototype: Toolbar clicked', tab.url);

    if (!this.isYouTubeTV(tab.url)) {
      console.log('❌ Not on YouTube TV');
      return;
    }

    if (this.isActive) {
      await this.deactivateQuadTV();
    } else {
      await this.activateQuadTV(tab);
    }
  }

  async activateQuadTV(controlTab) {
    console.log('🚀 Prototype: Activating QuadTV multi-tab mode');

    this.controlTabId = controlTab.id;
    this.isActive = true;

    try {
      // Test: Open 3 additional YouTube TV tabs (total of 4 streams)
      const additionalTabs = await this.createAdditionalTabs();

      // Setup the stream tab mapping
      this.streamTabs.set(0, controlTab.id); // Original tab = stream 0
      additionalTabs.forEach((tabId, index) => {
        this.streamTabs.set(index + 1, tabId);
      });

      // Set first tab as active audio
      this.activeAudioTab = controlTab.id;

      // Notify all tabs about activation
      await this.notifyAllTabs('QUADTV_ACTIVATED', {
        streamTabs: Array.from(this.streamTabs.entries()),
        activeAudioTab: this.activeAudioTab
      });

      // Initial audio setup - mute all except active
      await this.updateAudioStates();

      console.log('✅ Prototype: QuadTV activated successfully');
      console.log('📊 Stream tabs:', Array.from(this.streamTabs.entries()));

    } catch (error) {
      console.error('❌ Prototype: Failed to activate QuadTV:', error);
      this.isActive = false;
    }
  }

  async createAdditionalTabs() {
    const newTabIds = [];

    // Create 3 additional tabs with YouTube TV home page
    for (let i = 1; i <= 3; i++) {
      try {
        const tab = await browser.tabs.create({
          url: 'https://tv.youtube.com',
          active: false // Don't switch to the new tab
        });

        newTabIds.push(tab.id);
        console.log(`📺 Created stream ${i} tab:`, tab.id);

        // Small delay to avoid overwhelming YouTube TV
        await this.delay(200);

      } catch (error) {
        console.error(`❌ Failed to create tab ${i}:`, error);
      }
    }

    return newTabIds;
  }

  async deactivateQuadTV() {
    console.log('🛑 Prototype: Deactivating QuadTV');

    // Notify all tabs about deactivation
    await this.notifyAllTabs('QUADTV_DEACTIVATED');

    // Close additional tabs (keep the original control tab)
    for (const [streamIndex, tabId] of this.streamTabs.entries()) {
      if (streamIndex > 0) { // Don't close the original tab (stream 0)
        try {
          await browser.tabs.remove(tabId);
          console.log(`🗑️ Closed stream ${streamIndex} tab:`, tabId);
        } catch (error) {
          console.error(`❌ Failed to close tab ${tabId}:`, error);
        }
      }
    }

    // Reset state
    this.streamTabs.clear();
    this.activeAudioTab = null;
    this.controlTabId = null;
    this.isActive = false;

    console.log('✅ Prototype: QuadTV deactivated');
  }

  async handleMessage(message, sender, sendResponse) {
    console.log('📩 Prototype: Message received:', message.type, 'from tab:', sender.tab?.id);

    switch (message.type) {
      case 'TOGGLE_QUADTV':
        await this.handleToolbarClick(message.tab);
        sendResponse({ success: true });
        break;

      case 'SWITCH_AUDIO':
        await this.switchAudio(message.streamIndex);
        sendResponse({ success: true });
        break;

      case 'GET_STATE':
        sendResponse({
          isActive: this.isActive,
          streamTabs: Array.from(this.streamTabs.entries()),
          activeAudioTab: this.activeAudioTab,
          isControlTab: sender.tab?.id === this.controlTabId
        });
        break;

      case 'TAB_READY':
        console.log(`✅ Tab ${sender.tab?.id} is ready for QuadTV`);
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  async switchAudio(targetStreamIndex) {
    console.log(`🔊 Prototype: Switching audio to stream ${targetStreamIndex}`);

    const targetTabId = this.streamTabs.get(targetStreamIndex);
    if (!targetTabId) {
      console.error('❌ Stream not found:', targetStreamIndex);
      return;
    }

    this.activeAudioTab = targetTabId;
    await this.updateAudioStates();

    // Notify all tabs about the audio change
    await this.notifyAllTabs('AUDIO_CHANGED', {
      activeAudioTab: this.activeAudioTab,
      activeStreamIndex: targetStreamIndex
    });
  }

  async updateAudioStates() {
    console.log('🔇 Prototype: Updating audio states');

    for (const [streamIndex, tabId] of this.streamTabs.entries()) {
      const shouldHaveAudio = tabId === this.activeAudioTab;

      try {
        await browser.tabs.sendMessage(tabId, {
          type: 'SET_AUDIO_STATE',
          hasAudio: shouldHaveAudio,
          streamIndex: streamIndex
        });

        console.log(`🔊 Stream ${streamIndex} (tab ${tabId}): audio ${shouldHaveAudio ? 'ON' : 'OFF'}`);
      } catch (error) {
        console.error(`❌ Failed to set audio for tab ${tabId}:`, error);
      }
    }
  }

  async notifyAllTabs(messageType, data = {}) {
    const message = { type: messageType, ...data };

    for (const [streamIndex, tabId] of this.streamTabs.entries()) {
      try {
        await browser.tabs.sendMessage(tabId, message);
      } catch (error) {
        console.error(`❌ Failed to notify tab ${tabId}:`, error);
      }
    }
  }

  handleTabClosed(tabId) {
    // Find which stream this tab was
    let closedStreamIndex = null;
    for (const [streamIndex, streamTabId] of this.streamTabs.entries()) {
      if (streamTabId === tabId) {
        closedStreamIndex = streamIndex;
        break;
      }
    }

    if (closedStreamIndex !== null) {
      console.log(`🗑️ Stream ${closedStreamIndex} tab closed:`, tabId);
      this.streamTabs.delete(closedStreamIndex);

      // If this was the control tab, deactivate everything
      if (tabId === this.controlTabId) {
        console.log('🛑 Control tab closed, deactivating QuadTV');
        this.deactivateQuadTV();
      }
    }
  }

  isYouTubeTV(url) {
    return url && url.includes('tv.youtube.com');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize the prototype
console.log('🧪 QuadTV Prototype background script starting...');
const quadTVPrototype = new QuadTVPrototype();
console.log('🧪 QuadTV Prototype background script loaded and initialized');