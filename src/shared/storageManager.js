class StorageManager {
  constructor() {
    this.storage = browser.storage.local;
  }

  async saveSettings(settings) {
    try {
      await this.storage.set({ quadtvSettings: settings });
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  async getSettings() {
    try {
      const result = await this.storage.get('quadtvSettings');
      return result.quadtvSettings || this.getDefaultSettings();
    } catch (error) {
      console.error('Failed to get settings:', error);
      return this.getDefaultSettings();
    }
  }

  async savePreset(name, preset) {
    try {
      const presets = await this.getPresets();
      presets[name] = preset;
      await this.storage.set({ quadtvPresets: presets });
      return true;
    } catch (error) {
      console.error('Failed to save preset:', error);
      return false;
    }
  }

  async getPresets() {
    try {
      const result = await this.storage.get('quadtvPresets');
      return result.quadtvPresets || {};
    } catch (error) {
      console.error('Failed to get presets:', error);
      return {};
    }
  }

  async deletePreset(name) {
    try {
      const presets = await this.getPresets();
      delete presets[name];
      await this.storage.set({ quadtvPresets: presets });
      return true;
    } catch (error) {
      console.error('Failed to delete preset:', error);
      return false;
    }
  }

  getDefaultSettings() {
    return {
      lastLayout: '2x2',
      audioIndicatorColor: '#ff0000',
      enableKeyboardShortcuts: true
    };
  }
}

window.QuadTVStorageManager = window.QuadTVStorageManager || new StorageManager();