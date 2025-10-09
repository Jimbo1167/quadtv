class PopupManager {
  constructor() {
    this.isActive = false;
    this.currentLayout = '2x2';
    this.storageManager = window.QuadTVStorageManager;
    this.layoutEngine = window.QuadTVLayoutEngine;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadSettings();
    await this.updateStatus();
  }

  setupEventListeners() {
    document.getElementById('toggleBtn').addEventListener('click', () => {
      this.toggleQuadTV();
    });

    // Layout selection
    document.querySelectorAll('.layout-option').forEach(button => {
      button.addEventListener('click', (e) => {
        const layout = e.currentTarget.dataset.layout;
        this.setLayout(layout);
      });
    });
  }

  async loadSettings() {
    const settings = await this.storageManager.getSettings();
    this.currentLayout = settings.lastLayout || '2x2';
    this.updateLayoutSelection();
  }

  async updateStatus() {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (!tab || !tab.url.includes('tv.youtube.com')) {
        this.setInactive('Not on YouTube TV');
        return;
      }

      const response = await browser.runtime.sendMessage({ type: 'GET_TAB_STATE' });
      this.isActive = response?.isActive || false;

      this.updateUI();
    } catch (error) {
      console.error('Failed to get status:', error);
      this.setInactive('Error');
    }
  }

  updateUI() {
    const statusIndicator = document.getElementById('status');
    const toggleBtn = document.getElementById('toggleBtn');

    if (this.isActive) {
      statusIndicator.classList.add('active');
      toggleBtn.textContent = 'Deactivate QuadTV';
      toggleBtn.classList.add('deactivate');
    } else {
      statusIndicator.classList.remove('active');
      toggleBtn.textContent = 'Activate QuadTV';
      toggleBtn.classList.remove('deactivate');
    }
  }

  setInactive(reason) {
    this.isActive = false;
    document.getElementById('status').classList.remove('active');
    const toggleBtn = document.getElementById('toggleBtn');
    toggleBtn.textContent = reason;
    toggleBtn.disabled = true;
  }

  async toggleQuadTV() {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (!tab) return;

      // Send activation message with current layout
      const message = {
        type: this.isActive ? 'DEACTIVATE_QUADTV' : 'ACTIVATE_QUADTV'
      };

      // Include layout when activating
      if (!this.isActive) {
        message.layout = this.currentLayout;
      }

      await browser.tabs.sendMessage(tab.id, message);

      // Update status after a brief delay
      setTimeout(() => this.updateStatus(), 100);
    } catch (error) {
      console.error('Failed to toggle QuadTV:', error);
    }
  }

  async setLayout(layout) {
    this.currentLayout = layout;
    this.updateLayoutSelection();

    // Save to settings
    const settings = await this.storageManager.getSettings();
    settings.lastLayout = layout;
    await this.storageManager.saveSettings(settings);

    // Send to background script if active
    if (this.isActive) {
      try {
        await browser.runtime.sendMessage({
          type: 'SET_LAYOUT',
          layout: layout
        });
        console.log(`📐 Popup: Layout changed to ${layout}`);
      } catch (error) {
        console.error('Failed to set layout:', error);
      }
    }
  }

  updateLayoutSelection() {
    document.querySelectorAll('.layout-option').forEach(button => {
      button.classList.toggle('active', button.dataset.layout === this.currentLayout);
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
  });
} else {
  new PopupManager();
}