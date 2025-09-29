/**
 * QTV-025: PostMessage Infrastructure
 * Standardized message protocol for parent-iframe communication
 */

class QuadTVMessageProtocol {
  constructor() {
    this.messageTypes = {
      // Parent → Iframe messages
      SET_AUDIO_STATE: 'SET_AUDIO_STATE',
      MUTE_AUDIO: 'MUTE_AUDIO',
      UNMUTE_AUDIO: 'UNMUTE_AUDIO',
      GET_AUDIO_STATE: 'GET_AUDIO_STATE',
      IFRAME_READY_CHECK: 'IFRAME_READY_CHECK',

      // Iframe → Parent messages
      IFRAME_READY: 'IFRAME_READY',
      AUDIO_STATE_CHANGED: 'AUDIO_STATE_CHANGED',
      USER_CLICKED_STREAM: 'USER_CLICKED_STREAM',
      AUDIO_CONTROL_FAILED: 'AUDIO_CONTROL_FAILED',
      VIDEO_FOUND: 'VIDEO_FOUND',
      VIDEO_LOST: 'VIDEO_LOST'
    };

    this.messageHandlers = new Map();
    this.pendingMessages = new Map();
    this.messageId = 0;
  }

  /**
   * Create a standardized message
   */
  createMessage(type, payload = {}, requiresResponse = false) {
    const message = {
      type,
      payload,
      timestamp: Date.now(),
      source: 'QuadTV',
      id: requiresResponse ? ++this.messageId : null
    };

    return message;
  }

  /**
   * Send message to iframe
   */
  sendToIframe(iframe, type, payload = {}, requiresResponse = false) {
    return new Promise((resolve, reject) => {
      if (!iframe || !iframe.contentWindow) {
        reject(new Error('Invalid iframe reference'));
        return;
      }

      const message = this.createMessage(type, payload, requiresResponse);

      if (requiresResponse) {
        // Store promise resolver for response
        this.pendingMessages.set(message.id, { resolve, reject });

        // Timeout after 5 seconds
        setTimeout(() => {
          if (this.pendingMessages.has(message.id)) {
            this.pendingMessages.delete(message.id);
            reject(new Error(`Message timeout: ${type}`));
          }
        }, 5000);
      }

      try {
        iframe.contentWindow.postMessage(message, 'https://tv.youtube.com');

        if (!requiresResponse) {
          resolve();
        }
      } catch (error) {
        if (requiresResponse) {
          this.pendingMessages.delete(message.id);
        }
        reject(error);
      }
    });
  }

  /**
   * Send message to parent
   */
  sendToParent(type, payload = {}, requiresResponse = false) {
    return new Promise((resolve, reject) => {
      if (window.self === window.top) {
        reject(new Error('Not in iframe context'));
        return;
      }

      const message = this.createMessage(type, payload, requiresResponse);

      if (requiresResponse) {
        this.pendingMessages.set(message.id, { resolve, reject });

        setTimeout(() => {
          if (this.pendingMessages.has(message.id)) {
            this.pendingMessages.delete(message.id);
            reject(new Error(`Message timeout: ${type}`));
          }
        }, 5000);
      }

      try {
        window.parent.postMessage(message, '*');

        if (!requiresResponse) {
          resolve();
        }
      } catch (error) {
        if (requiresResponse) {
          this.pendingMessages.delete(message.id);
        }
        reject(error);
      }
    });
  }

  /**
   * Register message handler
   */
  onMessage(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
  }

  /**
   * Remove message handler
   */
  offMessage(type, handler) {
    if (this.messageHandlers.has(type)) {
      const handlers = this.messageHandlers.get(type);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Handle incoming postMessage
   */
  handleMessage(event) {
    // Security: Only accept messages from YouTube TV or same origin
    if (event.origin !== 'https://tv.youtube.com' &&
        event.origin !== window.location.origin) {
      return;
    }

    const message = event.data;

    // Validate message format
    if (!message || message.source !== 'QuadTV' || !message.type) {
      return;
    }

    console.log(`📨 QuadTV Message: ${message.type}`, message.payload);

    // Handle response to pending message
    if (message.responseToId && this.pendingMessages.has(message.responseToId)) {
      const { resolve } = this.pendingMessages.get(message.responseToId);
      this.pendingMessages.delete(message.responseToId);
      resolve(message.payload);
      return;
    }

    // Handle new message
    if (this.messageHandlers.has(message.type)) {
      const handlers = this.messageHandlers.get(message.type);
      handlers.forEach(handler => {
        try {
          const response = handler(message.payload, message);

          // Send response if message requires one
          if (message.id && response !== undefined) {
            const responseMessage = {
              ...this.createMessage('RESPONSE'),
              responseToId: message.id,
              payload: response
            };

            if (window.self === window.top) {
              // Parent responding to iframe
              // Note: This will be handled by the specific iframe sender
            } else {
              // Iframe responding to parent
              window.parent.postMessage(responseMessage, '*');
            }
          }
        } catch (error) {
          console.error(`Error handling message ${message.type}:`, error);
        }
      });
    }
  }

  /**
   * Initialize message listening
   */
  init() {
    window.addEventListener('message', (event) => this.handleMessage(event));
    console.log('📨 QuadTV MessageProtocol initialized');
  }

  /**
   * Cleanup
   */
  destroy() {
    window.removeEventListener('message', this.handleMessage);
    this.messageHandlers.clear();
    this.pendingMessages.clear();
  }
}

// Export for use in both parent and iframe contexts
if (typeof window !== 'undefined') {
  window.QuadTVMessageProtocol = QuadTVMessageProtocol;
}

// Also support module exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuadTVMessageProtocol;
}