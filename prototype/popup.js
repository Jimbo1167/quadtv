// QuadTV Prototype - Popup Script
// Simple interface for testing multi-tab functionality

class PrototypePopup {
  constructor() {
    this.isActive = false;
    this.streamTabs = [];
    this.activeAudioTab = null;

    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.updateStatus();
  }

  setupEventListeners() {
    document.getElementById('toggleBtn').addEventListener('click', () => {
      this.handleToggle();
    });

    document.getElementById('testAudioBtn').addEventListener('click', () => {
      this.testAudioSwitch();
    });
  }

  async handleToggle() {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (!currentTab.url.includes('tv.youtube.com')) {
        alert('Please navigate to YouTube TV first (tv.youtube.com)');
        return;
      }

      // Direct message to background script
      const response = await browser.runtime.sendMessage({
        type: 'TOGGLE_QUADTV',
        tab: currentTab
      });

      console.log('Toggle response:', response);

    } catch (error) {
      console.error('Failed to toggle:', error);
      alert('Failed to toggle QuadTV. Check console for details.');
    }

    // Update status after a brief delay
    setTimeout(() => this.updateStatus(), 500);
  }

  async testAudioSwitch() {
    // Cycle through audio on different streams
    if (this.streamTabs.length === 0) return;

    const currentIndex = this.streamTabs.findIndex(([index, tabId]) => tabId === this.activeAudioTab);
    const nextIndex = (currentIndex + 1) % this.streamTabs.length;
    const [streamIndex] = this.streamTabs[nextIndex];

    try {
      await browser.runtime.sendMessage({
        type: 'SWITCH_AUDIO',
        streamIndex: streamIndex
      });

      setTimeout(() => this.updateStatus(), 200);

    } catch (error) {
      console.error('Failed to switch audio:', error);
    }
  }

  async updateStatus() {
    try {
      // Get current state from background
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      const response = await browser.runtime.sendMessage({
        type: 'GET_STATE'
      });

      this.isActive = response.isActive || false;
      this.streamTabs = response.streamTabs || [];
      this.activeAudioTab = response.activeAudioTab;

      this.updateUI();

    } catch (error) {
      console.error('Failed to get status:', error);
      this.updateUI(false);
    }
  }

  updateUI(hasConnection = true) {
    const statusDiv = document.getElementById('status');
    const statusText = document.getElementById('statusText');
    const statusDetails = document.getElementById('statusDetails');
    const toggleBtn = document.getElementById('toggleBtn');
    const testAudioBtn = document.getElementById('testAudioBtn');
    const streamListDiv = document.getElementById('streamList');

    if (!hasConnection) {
      statusDiv.className = 'status inactive';
      statusText.textContent = 'Connection Error';
      statusDetails.textContent = 'Cannot communicate with background script';
      toggleBtn.textContent = 'Reload Extension';
      testAudioBtn.style.display = 'none';
      streamListDiv.style.display = 'none';
      return;
    }

    if (this.isActive) {
      statusDiv.className = 'status active';
      statusText.textContent = 'Active';
      statusDetails.textContent = `${this.streamTabs.length} tabs open`;
      toggleBtn.textContent = 'Deactivate QuadTV';
      testAudioBtn.style.display = 'block';
      streamListDiv.style.display = 'block';

      this.updateStreamList();
    } else {
      statusDiv.className = 'status inactive';
      statusText.textContent = 'Inactive';
      statusDetails.textContent = 'Ready to activate on YouTube TV';
      toggleBtn.textContent = 'Activate QuadTV';
      testAudioBtn.style.display = 'none';
      streamListDiv.style.display = 'none';
    }
  }

  updateStreamList() {
    const streamsDiv = document.getElementById('streams');
    streamsDiv.innerHTML = '';

    this.streamTabs.forEach(([streamIndex, tabId]) => {
      const streamDiv = document.createElement('div');
      streamDiv.className = 'stream-item';

      const isActiveAudio = tabId === this.activeAudioTab;
      const audioStatus = isActiveAudio ? '🔊' : '🔇';
      const className = isActiveAudio ? 'audio-active' : '';

      streamDiv.innerHTML = `
        <span class="${className}">
          ${audioStatus} Stream ${streamIndex} (Tab ${tabId})
        </span>
      `;

      streamsDiv.appendChild(streamDiv);
    });
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PrototypePopup();
});