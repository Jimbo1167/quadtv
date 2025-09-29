class BackgroundController {
  constructor() {
    this.activeTabStates = new Map();
    this.streamTabs = new Map(); // Map<streamIndex, tabId>
    this.activeAudioTab = null;
    this.controlTabId = null;
    this.isActive = false;
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

    // Update icon state when tab URL changes and handle navigation tracking
    browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' || changeInfo.url) {
        await this.updateIconState(tabId);

        // Handle YouTube TV SPA navigation for stream tabs
        if (this.isActive && this.streamTabs.has(tabId) && changeInfo.url) {
          console.log(`🗺️ Navigation detected in stream tab ${tabId}: ${changeInfo.url}`);
          // Re-inject tab ID and re-notify about QuadTV state
          await this.handleTabNavigation(tabId);
        }
      }
    });

    // Clean up state when tabs are closed
    browser.tabs.onRemoved.addListener((tabId) => {
      this.handleTabClosed(tabId);
    });
  }

  async handleTabNavigation(tabId) {
    try {
      // Re-inject tab ID
      await browser.tabs.executeScript(tabId, {
        code: `window.quadTVCurrentTabId = ${tabId};`
      });

      // Small delay to ensure content script is ready
      await this.delay(500);

      // Re-notify about QuadTV state
      await browser.tabs.sendMessage(tabId, {
        type: 'QUADTV_ACTIVATED',
        streamTabs: Array.from(this.streamTabs.entries()),
        activeAudioTab: this.activeAudioTab
      });

      console.log(`✅ Re-synchronized tab ${tabId} after navigation`);
    } catch (error) {
      console.error(`❌ Failed to handle navigation for tab ${tabId}:`, error);
    }
  }

  handleTabClosed(tabId) {
    this.activeTabStates.delete(tabId);

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
      console.log('🗺️ Before deletion, streamTabs:', Array.from(this.streamTabs.entries()));
      this.streamTabs.delete(closedStreamIndex);
      console.log('🗺️ After deletion, streamTabs:', Array.from(this.streamTabs.entries()));

      // If this was the control tab, deactivate everything
      if (tabId === this.controlTabId) {
        console.log('🛑 Control tab closed, deactivating QuadTV');
        this.deactivateQuadTV();
      }
    }
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

        let title;
        if (isActive && this.isActive) {
          // Find stream index for this tab
          let streamIndex = null;
          for (const [index, streamTabId] of this.streamTabs.entries()) {
            if (streamTabId === tabId) {
              streamIndex = index;
              break;
            }
          }
          const isAudioActive = tabId === this.activeAudioTab;
          title = streamIndex !== null
            ? `QuadTV: Stream ${streamIndex} ${isAudioActive ? '(Audio Active)' : '(Muted)'}`
            : "QuadTV: Active (Click to deactivate)";
        } else {
          title = "QuadTV: Click to activate";
        }

        await browser.browserAction.setTitle({ tabId: tabId, title });
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

    if (this.isActive) {
      await this.deactivateQuadTV();
    } else {
      await this.activateQuadTV(tab);
    }
  }

  async activateQuadTV(controlTab) {
    console.log('🚀 Background: Activating QuadTV grid mode');

    this.controlTabId = controlTab.id;
    this.isActive = true;

    try {
      // In iframe-based approach, everything happens in one tab
      console.log('📺 Activating QuadTV grid in tab:', controlTab.id);

      // Notify the control tab to activate the grid
      await browser.tabs.sendMessage(controlTab.id, {
        type: 'QUADTV_ACTIVATED',
        currentLayout: this.currentLayout
      });

      // Update icon state
      this.activeTabStates.set(controlTab.id, true);
      await this.updateIconState(controlTab.id);

      console.log('✅ Background: QuadTV grid activated successfully');

    } catch (error) {
      console.error('❌ Background: Failed to activate QuadTV:', error);
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
          active: false
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

  async setTabIds() {
    // Inject tab ID into each tab's content script context
    for (const [streamIndex, tabId] of this.streamTabs.entries()) {
      try {
        await browser.tabs.executeScript(tabId, {
          code: `window.quadTVCurrentTabId = ${tabId};`
        });
      } catch (error) {
        console.error(`Failed to set tab ID for tab ${tabId}:`, error);
      }
    }
  }

  async deactivateQuadTV() {
    console.log('🛑 Background: Deactivating QuadTV');

    // Notify the control tab about deactivation
    if (this.controlTabId) {
      try {
        await browser.tabs.sendMessage(this.controlTabId, {
          type: 'QUADTV_DEACTIVATED'
        });
      } catch (error) {
        console.log('Could not notify control tab:', error);
      }

      // Update icon state for control tab
      this.activeTabStates.set(this.controlTabId, false);
      await this.updateIconState(this.controlTabId);
    }

    // Reset state
    this.controlTabId = null;
    this.isActive = false;

    console.log('✅ Background: QuadTV deactivated');
  }

  async handleMessage(message, sender, sendResponse) {
    console.log('📩 Background: Message received:', message.type, 'from tab:', sender.tab?.id);

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
        sendResponse({ success: true });
        break;

      case 'TOGGLE_QUADTV':
        await this.toggleQuadTV(message.tab || sender.tab);
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

      case 'FOCUS_TAB':
        if (message.streamIndex !== undefined) {
          const targetTabId = this.streamTabs.get(message.streamIndex);
          if (targetTabId) {
            await browser.tabs.update(targetTabId, { active: true });
          }
        }
        sendResponse({ success: true });
        break;

      case 'LAYOUT_CHANGED':
        // Handle layout changes with audio state preservation
        if (message.preserveAudio) {
          console.log('📋 Background: Layout changed, preserving audio state');
          // Re-validate audio state after layout change
          setTimeout(() => {
            this.validateExclusiveAudio();
          }, 500);
        }
        sendResponse({ success: true });
        break;

      case 'SET_LAYOUT':
        await this.setLayout(message.layout);
        sendResponse({ success: true });
        break;

      case 'INJECT_IFRAME_SCRIPT':
        await this.injectIframeScript(message, sender, sendResponse);
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  async switchAudio(targetStreamIndex) {
    console.log(`🔊 Background: Switching audio to stream ${targetStreamIndex}`);
    console.log('🗺️ Current streamTabs mapping:', Array.from(this.streamTabs.entries()));
    console.log('🎯 Looking for stream index:', targetStreamIndex);

    const targetTabId = this.streamTabs.get(targetStreamIndex);
    if (!targetTabId) {
      console.error('❌ Stream not found:', targetStreamIndex);
      console.error('❌ Available streams:', Array.from(this.streamTabs.keys()));
      console.error('❌ streamTabs size:', this.streamTabs.size);
      console.error('❌ isActive:', this.isActive);
      
      // Attempt to recover by rebuilding streamTabs mapping
      console.log('🔧 Attempting to recover streamTabs mapping...');
      await this.recoverStreamMapping();
      
      // Try again after recovery
      const recoveredTabId = this.streamTabs.get(targetStreamIndex);
      if (!recoveredTabId) {
        console.error('❌ Recovery failed, stream still not found');
        return;
      }
      console.log('✅ Recovery successful, continuing with audio switch');
      return this.switchAudio(targetStreamIndex); // Recursive call with recovered mapping
    }

    this.activeAudioTab = targetTabId;
    await this.updateBrowserAudioStates();

    // Notify all tabs about the audio change
    await this.notifyAllTabs('AUDIO_CHANGED', {
      activeAudioTab: this.activeAudioTab,
      activeStreamIndex: targetStreamIndex
    });
  }

  async updateBrowserAudioStates() {
    console.log('🔇 Background: Updating browser-level audio states');

    for (const [streamIndex, tabId] of this.streamTabs.entries()) {
      const shouldHaveAudio = tabId === this.activeAudioTab;

      try {
        // Use browser-level tab muting for more reliable control
        await browser.tabs.update(tabId, { muted: !shouldHaveAudio });

        // Also send message to content script for visual feedback
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

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isYouTubeTV(url) {
    return url && url.includes('tv.youtube.com');
  }

  async setLayout(layoutType) {
    if (!this.isActive) {
      console.log('📐 Layout: QuadTV not active, ignoring layout change');
      return;
    }

    console.log(`📐 Background: Setting layout to ${layoutType}`);
    this.currentLayout = layoutType;

    try {
      // Get layout configuration for visual coordination
      const layoutConfig = this.getLayoutConfig(layoutType);
      console.log('📐 Layout config:', layoutConfig);

      // Notify the control tab about the layout change
      if (this.controlTabId) {
        try {
          await browser.tabs.sendMessage(this.controlTabId, {
            type: 'LAYOUT_CHANGED',
            layout: layoutType,
            layoutConfig: layoutConfig
          });
        } catch (error) {
          console.log('Could not notify control tab of layout change:', error);
        }
      }

      console.log(`✅ Layout: Successfully applied ${layoutType} layout`);

    } catch (error) {
      console.error('❌ Layout: Failed to apply layout:', error);
    }
  }

  // QTV-026: Iframe Content Script Injection
  async injectIframeScript(message, sender, sendResponse) {
    try {
      console.log(`📺 Background: Injecting iframe script for stream ${message.streamIndex}`);

      // Since we can't directly inject into cross-origin iframes,
      // we'll try to find a YouTube TV tab that matches the iframe source
      const youtubeTVTabs = await browser.tabs.query({
        url: '*://tv.youtube.com/*'
      });

      if (youtubeTVTabs.length === 0) {
        throw new Error('No YouTube TV tabs found for script injection');
      }

      // Load the message protocol and iframe script content
      const scriptFiles = [
        'shared/messageProtocol.js',
        'content/iframeContentScript.js'
      ];

      // Try to inject into all YouTube TV tabs
      // (the correct iframe will pick up the script)
      let injectionCount = 0;
      for (const tab of youtubeTVTabs) {
        try {
          // Check if tab is accessible
          await browser.tabs.get(tab.id);

          // Inject scripts
          for (const file of scriptFiles) {
            await browser.tabs.executeScript(tab.id, {
              file: file,
              allFrames: true // This includes iframes
            });
          }

          injectionCount++;
          console.log(`📺 Scripts injected into tab ${tab.id}`);

        } catch (tabError) {
          console.log(`📺 Could not inject into tab ${tab.id}:`, tabError.message);
        }
      }

      if (injectionCount > 0) {
        sendResponse({
          success: true,
          injectedTabs: injectionCount,
          message: `Scripts injected into ${injectionCount} YouTube TV tabs`
        });
      } else {
        throw new Error('Failed to inject scripts into any YouTube TV tabs');
      }

    } catch (error) {
      console.error('❌ Background: Iframe script injection failed:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  getLayoutConfig(layoutType) {
    // Return layout metadata that tabs can use for visual coordination
    const layouts = {
      '2x2': {
        description: '2×2 Grid Layout',
        streamRoles: [
          { position: 'top-left', size: 'quarter', priority: 1 },
          { position: 'top-right', size: 'quarter', priority: 2 },
          { position: 'bottom-left', size: 'quarter', priority: 3 },
          { position: 'bottom-right', size: 'quarter', priority: 4 }
        ],
        instructions: 'Arrange browser windows in a 2×2 grid for optimal viewing'
      },
      '1+3': {
        description: '1+3 Focus Layout',
        streamRoles: [
          { position: 'main', size: 'large', priority: 1 },
          { position: 'sidebar-top', size: 'small', priority: 2 },
          { position: 'sidebar-middle', size: 'small', priority: 3 },
          { position: 'sidebar-bottom', size: 'small', priority: 4 }
        ],
        instructions: 'Primary stream takes 2/3 width, others stack vertically on right'
      },
      '2-vertical': {
        description: '2 Vertical Layout',
        streamRoles: [
          { position: 'left', size: 'half', priority: 1 },
          { position: 'right', size: 'half', priority: 2 }
        ],
        instructions: 'Two streams side-by-side, full height'
      }
    };

    return layouts[layoutType] || layouts['2x2'];
  }

  async getScreenInfo() {
    // Get the current window to determine screen size
    const currentWindow = await browser.windows.getCurrent();
    
    // Use reasonable defaults based on common screen sizes
    // In a real implementation, we might use the Screen API
    return {
      width: 1920,  // Assume 1080p screen
      height: 1080,
      availableWidth: 1920,
      availableHeight: 1040  // Account for taskbar/dock
    };
  }

  calculateTabPositions(layoutType, screenInfo) {
    const { availableWidth, availableHeight } = screenInfo;
    const margin = 8; // Small margin between windows
    
    const layouts = {
      '2x2': [
        { x: 0, y: 0, width: availableWidth / 2 - margin, height: availableHeight / 2 - margin },
        { x: availableWidth / 2 + margin, y: 0, width: availableWidth / 2 - margin, height: availableHeight / 2 - margin },
        { x: 0, y: availableHeight / 2 + margin, width: availableWidth / 2 - margin, height: availableHeight / 2 - margin },
        { x: availableWidth / 2 + margin, y: availableHeight / 2 + margin, width: availableWidth / 2 - margin, height: availableHeight / 2 - margin }
      ],
      '1+3': [
        { x: 0, y: 0, width: (availableWidth * 2/3) - margin, height: availableHeight },
        { x: (availableWidth * 2/3) + margin, y: 0, width: (availableWidth / 3) - margin, height: availableHeight / 3 - margin },
        { x: (availableWidth * 2/3) + margin, y: availableHeight / 3 + margin, width: (availableWidth / 3) - margin, height: availableHeight / 3 - margin },
        { x: (availableWidth * 2/3) + margin, y: (availableHeight * 2/3) + margin, width: (availableWidth / 3) - margin, height: availableHeight / 3 - margin }
      ],
      '2-vertical': [
        { x: 0, y: 0, width: availableWidth / 2 - margin, height: availableHeight },
        { x: availableWidth / 2 + margin, y: 0, width: availableWidth / 2 - margin, height: availableHeight }
      ]
    };

    return layouts[layoutType] || layouts['2x2'];
  }

  async positionTab(tabId, position) {
    try {
      // Get the window containing this tab
      const tab = await browser.tabs.get(tabId);
      const windowId = tab.windowId;

      // Update window position and size
      await browser.windows.update(windowId, {
        left: Math.round(position.x),
        top: Math.round(position.y),
        width: Math.round(position.width),
        height: Math.round(position.height),
        focused: false  // Don't steal focus
      });

      console.log(`📐 Positioned tab ${tabId} at (${position.x}, ${position.y}) ${position.width}x${position.height}`);

    } catch (error) {
      console.error(`❌ Failed to position tab ${tabId}:`, error);
    }
  }

  async recoverStreamMapping() {
    console.log('🔧 Recovery: Attempting to rebuild streamTabs mapping');
    
    try {
      // Get all tabs and find YouTube TV tabs that should be part of QuadTV
      const allTabs = await browser.tabs.query({});
      const youTubeTVTabs = allTabs.filter(tab => this.isYouTubeTV(tab.url));
      
      console.log('🔧 Recovery: Found YouTube TV tabs:', youTubeTVTabs.map(t => ({ id: t.id, url: t.url })));
      
      // Clear current mapping
      this.streamTabs.clear();
      
      // Try to identify which tabs belong to QuadTV by checking their state
      let streamIndex = 0;
      for (const tab of youTubeTVTabs) {
        // Check if this tab has QuadTV active
        try {
          const response = await browser.tabs.sendMessage(tab.id, { type: 'GET_TAB_STATE' });
          if (response && response.isQuadTVTab) {
            this.streamTabs.set(streamIndex, tab.id);
            console.log(`🔧 Recovery: Added stream ${streamIndex} -> tab ${tab.id}`);
            streamIndex++;
          }
        } catch (error) {
          // Tab might not have content script loaded, skip
          console.log(`🔧 Recovery: Tab ${tab.id} not responsive, skipping`);
        }
      }
      
      // If we found the control tab, set it
      if (this.streamTabs.has(0)) {
        this.controlTabId = this.streamTabs.get(0);
        console.log(`🔧 Recovery: Set control tab to ${this.controlTabId}`);
      }
      
      console.log('🔧 Recovery: Rebuilt streamTabs mapping:', Array.from(this.streamTabs.entries()));
      
    } catch (error) {
      console.error('🔧 Recovery: Failed to rebuild streamTabs mapping:', error);
    }
  }
}

new BackgroundController();