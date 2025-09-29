/**
 * QTV-026: Content Script for YouTube TV Iframes
 * This script runs inside each YouTube TV iframe to handle audio control
 */

class IframeContentManager {
  constructor() {
    this.streamIndex = null;
    this.hasAudio = false;
    this.videoElement = null;
    this.messageProtocol = new window.QuadTVMessageProtocol();
    this.videoCheckInterval = null;
    this.isReady = false;

    this.init();
  }

  async init() {
    console.log('📺 IframeContentManager: Initializing in iframe...');

    // Wait for page to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  async setup() {
    console.log('📺 IframeContentManager: Setting up iframe content script...');

    // Initialize message protocol
    this.messageProtocol.init();
    this.setupMessageHandlers();

    // Start looking for video element
    this.startVideoDetection();

    // Wait a bit for everything to initialize
    setTimeout(async () => {
      await this.notifyReady();
    }, 500);
  }

  setupMessageHandlers() {
    // Handle readiness check from parent
    this.messageProtocol.onMessage('IFRAME_READY_CHECK', async (payload) => {
      console.log('📨 Iframe: Received readiness check', payload);
      this.streamIndex = payload.streamIndex;
      await this.notifyReady();
    });

    // Handle audio state changes from parent
    this.messageProtocol.onMessage('SET_AUDIO_STATE', (payload) => {
      console.log(`📨 Iframe ${this.streamIndex}: Set audio state`, payload);
      this.setAudioState(payload.hasAudio);
    });

    // Handle mute command
    this.messageProtocol.onMessage('MUTE_AUDIO', (payload) => {
      console.log(`📨 Iframe ${this.streamIndex}: Mute audio`);
      this.setAudioState(false);
    });

    // Handle unmute command
    this.messageProtocol.onMessage('UNMUTE_AUDIO', (payload) => {
      console.log(`📨 Iframe ${this.streamIndex}: Unmute audio`);
      this.setAudioState(true);
    });

    // Handle audio state query
    this.messageProtocol.onMessage('GET_AUDIO_STATE', (payload) => {
      console.log(`📨 Iframe ${this.streamIndex}: Audio state query`);
      return {
        streamIndex: this.streamIndex,
        hasAudio: this.hasAudio,
        hasVideo: !!this.videoElement
      };
    });

    console.log('📨 IframeContentManager: Message handlers setup complete');
  }

  startVideoDetection() {
    // Look for video element immediately
    this.detectVideoElement();

    // Set up periodic checking for video element
    this.videoCheckInterval = setInterval(() => {
      this.detectVideoElement();
    }, 2000);

    console.log('📺 IframeContentManager: Video detection started');
  }

  detectVideoElement() {
    // Look for YouTube TV video element
    const videoSelectors = [
      'video',
      'video[src]',
      '.html5-video-player video',
      '.ytp-html5-video'
    ];

    let foundVideo = null;
    for (const selector of videoSelectors) {
      const videos = document.querySelectorAll(selector);
      if (videos.length > 0) {
        // Find the main video (usually the largest or most recently added)
        foundVideo = Array.from(videos).find(video =>
          video.videoWidth > 0 && video.videoHeight > 0
        ) || videos[0];
        break;
      }
    }

    if (foundVideo && foundVideo !== this.videoElement) {
      this.onVideoFound(foundVideo);
    } else if (!foundVideo && this.videoElement) {
      this.onVideoLost();
    }
  }

  onVideoFound(videoElement) {
    console.log(`📺 Iframe ${this.streamIndex}: Video element found`, videoElement);

    this.videoElement = videoElement;

    // Set up video event listeners
    this.setupVideoListeners();

    // Notify parent that video is available
    this.notifyParent('VIDEO_FOUND', {
      streamIndex: this.streamIndex,
      videoWidth: videoElement.videoWidth,
      videoHeight: videoElement.videoHeight,
      duration: videoElement.duration
    });

    // Apply current audio state
    this.applyAudioState();
  }

  onVideoLost() {
    console.log(`📺 Iframe ${this.streamIndex}: Video element lost`);

    if (this.videoElement) {
      this.cleanupVideoListeners();
      this.videoElement = null;
    }

    // Notify parent that video is no longer available
    this.notifyParent('VIDEO_LOST', {
      streamIndex: this.streamIndex
    });
  }

  setupVideoListeners() {
    if (!this.videoElement) return;

    // Monitor for external mute/unmute changes
    this.videoElement.addEventListener('volumechange', () => {
      this.onVolumeChange();
    });

    // Monitor for play/pause state
    this.videoElement.addEventListener('play', () => {
      console.log(`📺 Iframe ${this.streamIndex}: Video started playing`);
    });

    this.videoElement.addEventListener('pause', () => {
      console.log(`📺 Iframe ${this.streamIndex}: Video paused`);
    });

    console.log(`📺 Iframe ${this.streamIndex}: Video listeners setup`);
  }

  cleanupVideoListeners() {
    // Video element listeners are automatically cleaned up when element is removed
    console.log(`📺 Iframe ${this.streamIndex}: Video listeners cleaned up`);
  }

  onVolumeChange() {
    if (!this.videoElement) return;

    const actuallyMuted = this.videoElement.muted || this.videoElement.volume === 0;

    // If the actual state differs from what we expect, notify parent
    if (actuallyMuted !== !this.hasAudio) {
      console.log(`📺 Iframe ${this.streamIndex}: Volume changed externally - muted: ${actuallyMuted}`);

      this.hasAudio = !actuallyMuted;
      this.notifyAudioStateChanged();
    }
  }

  setAudioState(hasAudio) {
    console.log(`📺 Iframe ${this.streamIndex}: Setting audio state to ${hasAudio}`);

    this.hasAudio = hasAudio;
    this.applyAudioState();
    this.notifyAudioStateChanged();
  }

  applyAudioState() {
    if (!this.videoElement) {
      console.warn(`📺 Iframe ${this.streamIndex}: Cannot apply audio state - no video element`);
      return;
    }

    try {
      if (this.hasAudio) {
        // Unmute and set volume
        this.videoElement.muted = false;
        this.videoElement.volume = 1.0;

        // Try to play if paused (YouTube TV sometimes pauses when muted)
        if (this.videoElement.paused) {
          this.videoElement.play().catch(e => {
            console.log(`📺 Iframe ${this.streamIndex}: Play attempt failed:`, e.message);
          });
        }

        console.log(`🔊 Iframe ${this.streamIndex}: Audio enabled`);
      } else {
        // Mute
        this.videoElement.muted = true;
        console.log(`🔇 Iframe ${this.streamIndex}: Audio muted`);
      }
    } catch (error) {
      console.error(`📺 Iframe ${this.streamIndex}: Failed to apply audio state:`, error);

      // Notify parent of failure
      this.notifyParent('AUDIO_CONTROL_FAILED', {
        streamIndex: this.streamIndex,
        error: error.message,
        targetState: this.hasAudio
      });
    }
  }

  notifyAudioStateChanged() {
    try {
      this.notifyParent('AUDIO_STATE_CHANGED', {
        streamIndex: this.streamIndex,
        hasAudio: this.hasAudio,
        actualMuted: this.videoElement ? this.videoElement.muted : null,
        actualVolume: this.videoElement ? this.videoElement.volume : null
      });
    } catch (error) {
      console.error(`📺 Iframe ${this.streamIndex}: Failed to notify audio state change:`, error);
    }
  }

  async notifyReady() {
    if (this.isReady) return;

    console.log(`📺 Iframe ${this.streamIndex}: Notifying parent of readiness`);

    this.isReady = true;
    await this.notifyParent('IFRAME_READY', {
      streamIndex: this.streamIndex,
      hasVideo: !!this.videoElement,
      url: window.location.href
    });
  }


  async notifyParent(messageType, payload) {
    try {
      await this.messageProtocol.sendToParent(messageType, payload);
      console.log(`📨 Iframe ${this.streamIndex}: Sent ${messageType} to parent`);
    } catch (error) {
      console.error(`📨 Iframe ${this.streamIndex}: Failed to send ${messageType}:`, error);
    }
  }

  // Cleanup method
  destroy() {
    if (this.videoCheckInterval) {
      clearInterval(this.videoCheckInterval);
      this.videoCheckInterval = null;
    }

    this.cleanupVideoListeners();

    if (this.messageProtocol) {
      this.messageProtocol.destroy();
    }

    console.log(`📺 Iframe ${this.streamIndex}: IframeContentManager destroyed`);
  }
}

// Handle fallback script injection via postMessage
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'QUADTV_INJECT_SCRIPT') {
    console.log('📺 QuadTV: Received fallback script injection');

    try {
      // Execute the injected script
      const scriptFunc = new Function(event.data.scriptContent);
      scriptFunc();
      console.log('📺 QuadTV: Fallback script executed successfully');
    } catch (error) {
      console.error('📺 QuadTV: Fallback script execution failed:', error);
    }
  }
});

// Initialize when script loads
if (typeof window !== 'undefined' && window.QuadTVMessageProtocol) {
  // Only initialize if we're in an iframe context and have the message protocol
  if (window.self !== window.top) {
    console.log('📺 Initializing QuadTV iframe content script...');
    window.quadTVIframeManager = new IframeContentManager();
  }
} else {
  console.log('📺 QuadTV MessageProtocol not available, deferring iframe content script initialization');

  // Wait for the protocol to be available
  const checkProtocol = () => {
    if (window.QuadTVMessageProtocol && window.self !== window.top) {
      console.log('📺 QuadTV MessageProtocol now available, initializing...');
      window.quadTVIframeManager = new IframeContentManager();
    } else {
      setTimeout(checkProtocol, 100);
    }
  };

  setTimeout(checkProtocol, 100);
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IframeContentManager;
}