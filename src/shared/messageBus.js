class MessageBus {
  constructor() {
    this.subscribers = new Map();
  }

  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType).push(callback);
  }

  unsubscribe(eventType, callback) {
    if (this.subscribers.has(eventType)) {
      const callbacks = this.subscribers.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  publish(eventType, data = null) {
    if (this.subscribers.has(eventType)) {
      this.subscribers.get(eventType).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in message bus callback for ${eventType}:`, error);
        }
      });
    }
  }
}

// Create global instance
window.QuadTVMessageBus = window.QuadTVMessageBus || new MessageBus();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MessageBus };
}