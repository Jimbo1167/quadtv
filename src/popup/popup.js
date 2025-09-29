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
    await this.loadPresets();
    await this.updateStatus();
  }

  setupEventListeners() {
    document.getElementById('toggleBtn').addEventListener('click', () => {
      this.toggleQuadTV();
    });

    document.getElementById('savePresetBtn').addEventListener('click', () => {
      this.savePreset();
    });

    document.getElementById('presetName').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.savePreset();
      }
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

  async loadPresets() {
    const presets = await this.storageManager.getPresets();
    const presetList = document.getElementById('presetList');

    presetList.innerHTML = '';

    Object.entries(presets).forEach(([name, preset]) => {
      const presetElement = this.createPresetElement(name, preset);
      presetList.appendChild(presetElement);
    });

    if (Object.keys(presets).length === 0) {
      presetList.innerHTML = '<div class="no-presets">No saved presets</div>';
    }
  }

  createPresetElement(name, preset) {
    const div = document.createElement('div');
    div.className = 'preset-item';

    const date = new Date(preset.timestamp).toLocaleDateString();
    const streamCount = preset.streams.filter(s => s.isLoaded).length;

    div.innerHTML = `
      <div>
        <div class="preset-name">${name}</div>
        <div class="preset-meta">${preset.layout} • ${streamCount} streams • ${date}</div>
      </div>
      <button class="preset-delete" data-preset="${name}">×</button>
    `;

    div.addEventListener('click', (e) => {
      if (!e.target.classList.contains('preset-delete')) {
        this.loadPreset(name);
      }
    });

    div.querySelector('.preset-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      this.deletePreset(name);
    });

    return div;
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

      await browser.tabs.sendMessage(tab.id, {
        type: this.isActive ? 'DEACTIVATE_QUADTV' : 'ACTIVATE_QUADTV'
      });

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

  async savePreset() {
    const nameInput = document.getElementById('presetName');
    const name = nameInput.value.trim();

    if (!name) {
      alert('Please enter a preset name');
      return;
    }

    if (!this.isActive) {
      alert('QuadTV must be active to save a preset');
      return;
    }

    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (tab) {
        const response = await browser.tabs.sendMessage(tab.id, {
          type: 'SAVE_PRESET',
          name: name
        });

        if (response?.success) {
          nameInput.value = '';
          await this.loadPresets();
        } else {
          alert('Failed to save preset');
        }
      }
    } catch (error) {
      console.error('Failed to save preset:', error);
      alert('Failed to save preset');
    }
  }

  async loadPreset(name) {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (tab) {
        await browser.tabs.sendMessage(tab.id, {
          type: 'LOAD_PRESET',
          name: name
        });

        // Activate QuadTV if not already active
        if (!this.isActive) {
          await this.toggleQuadTV();
        }

        window.close();
      }
    } catch (error) {
      console.error('Failed to load preset:', error);
      alert('Failed to load preset');
    }
  }

  async deletePreset(name) {
    if (confirm(`Delete preset "${name}"?`)) {
      const success = await this.storageManager.deletePreset(name);
      if (success) {
        await this.loadPresets();
      }
    }
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