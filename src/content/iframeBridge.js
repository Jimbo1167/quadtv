/**
 * QTV-027: Iframe Bridge for Cross-Origin Communication
 * This script runs in the main tab and handles iframe communication
 */

class IframeBridge {
  constructor() {
    this.messageProtocol = window.QuadTVMessageProtocol;
    this.iframes = [];
    this.readyIframes = new Set();
    this.init();
  }

  init() {
    // Listen for messages from parent UIManager
    window.addEventListener('message', (event) => {
      this.handleParentMessage(event);
    });

    // Listen for messages from iframes
    window.addEventListener('message', (event) => {
      this.handleIframeMessage(event);
    });

    console.log('📺 IframeBridge: Initialized');
  }

  handleParentMessage(event) {
    const message = event.data;

    // Handle messages meant for iframe coordination
    if (message && message.source === 'QuadTV' && message.target === 'iframe') {
      console.log(`📨 IframeBridge: Routing message to iframe ${message.streamIndex}:`, message.type);

      const iframe = this.iframes[message.streamIndex];
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage({
            ...message,
            source: 'QuadTV'
          }, 'https://tv.youtube.com');
        } catch (error) {
          console.error(`📨 IframeBridge: Failed to send message to iframe ${message.streamIndex}:`, error);
        }
      }
    }
  }

  handleIframeMessage(event) {
    // Forward messages from iframes to parent
    if (event.origin === 'https://tv.youtube.com' &&
        event.data &&
        event.data.source === 'QuadTV' &&
        event.data.target === 'parent') {

      console.log(`📨 IframeBridge: Forwarding message from iframe to parent:`, event.data.type);

      // Forward to parent (remove target to avoid loops)
      const forwardMessage = { ...event.data };
      delete forwardMessage.target;

      window.postMessage(forwardMessage, window.location.origin);
    }
  }

  registerIframes(iframes) {
    this.iframes = iframes;
    console.log(`📺 IframeBridge: Registered ${iframes.length} iframes`);

    // Try to establish communication with each iframe
    iframes.forEach((iframe, index) => {
      this.establishIframeConnection(iframe, index);
    });
  }

  establishIframeConnection(iframe, index) {
    if (!iframe || !iframe.contentWindow) {
      console.warn(`📺 IframeBridge: Invalid iframe ${index}`);
      return;
    }

    // Inject our communication script into the iframe
    const scriptContent = this.getIframeScript(index);

    try {
      iframe.contentWindow.postMessage({
        type: 'QUADTV_BRIDGE_INIT',
        scriptContent: scriptContent,
        streamIndex: index
      }, 'https://tv.youtube.com');

      console.log(`📺 IframeBridge: Sent initialization to iframe ${index}`);
    } catch (error) {
      console.error(`📺 IframeBridge: Failed to initialize iframe ${index}:`, error);
    }
  }

  getIframeScript(streamIndex) {
    return `
      (function() {
        if (window.quadTVIframeHandler) return; // Already initialized

        console.log('📺 QuadTV: Initializing iframe handler for stream ${streamIndex}');

        const handler = {
          streamIndex: ${streamIndex},
          hasAudio: false,
          videoElement: null,

          init() {
            this.findVideo();
            this.setupMessageListener();
            this.notifyReady();

            // Set up video detection
            setInterval(() => {
              this.findVideo();
            }, 2000);
          },

          setupMessageListener() {
            window.addEventListener('message', (event) => {
              if (event.data && event.data.source === 'QuadTV') {
                this.handleMessage(event.data);
              }
            });
          },

          findVideo() {
            const video = document.querySelector('video');
            if (video && video !== this.videoElement) {
              console.log('📺 QuadTV iframe ${streamIndex}: Video found');
              this.videoElement = video;
              this.setupVideoListeners();
              this.sendToParent('VIDEO_FOUND', { streamIndex: this.streamIndex });
            }
          },

          setupVideoListeners() {
            if (!this.videoElement) return;

            this.videoElement.addEventListener('volumechange', () => {
              this.onVolumeChange();
            });
          },

          handleMessage(message) {
            console.log('📺 QuadTV iframe ${streamIndex}: Received message', message.type);

            switch(message.type) {
              case 'SET_AUDIO_STATE':
                this.setAudioState(message.payload.hasAudio);
                break;
              case 'IFRAME_READY_CHECK':
                this.notifyReady();
                break;
            }
          },

          setAudioState(hasAudio) {
            console.log('📺 QuadTV iframe ${streamIndex}: Setting audio to', hasAudio);
            this.hasAudio = hasAudio;

            if (this.videoElement) {
              try {
                this.videoElement.muted = !hasAudio;
                if (hasAudio) {
                  this.videoElement.volume = 1.0;
                  if (this.videoElement.paused) {
                    this.videoElement.play().catch(e => console.log('Play failed:', e.message));
                  }
                }

                this.sendToParent('AUDIO_STATE_CHANGED', {
                  streamIndex: this.streamIndex,
                  hasAudio: hasAudio,
                  actualMuted: this.videoElement.muted
                });
              } catch (error) {
                console.error('📺 QuadTV iframe ${streamIndex}: Audio control failed:', error);
                this.sendToParent('AUDIO_CONTROL_FAILED', {
                  streamIndex: this.streamIndex,
                  error: error.message
                });
              }
            }
          },

          onVolumeChange() {
            if (this.videoElement) {
              const actuallyMuted = this.videoElement.muted;
              if (actuallyMuted !== !this.hasAudio) {
                this.hasAudio = !actuallyMuted;
                this.sendToParent('AUDIO_STATE_CHANGED', {
                  streamIndex: this.streamIndex,
                  hasAudio: this.hasAudio,
                  actualMuted: actuallyMuted
                });
              }
            }
          },

          notifyReady() {
            this.sendToParent('IFRAME_READY', {
              streamIndex: this.streamIndex,
              hasVideo: !!this.videoElement
            });
          },

          sendToParent(type, payload) {
            try {
              window.parent.postMessage({
                type: type,
                payload: payload,
                source: 'QuadTV',
                target: 'parent'
              }, '*');
            } catch (error) {
              console.error('📺 QuadTV iframe ${streamIndex}: Failed to send to parent:', error);
            }
          }
        };

        handler.init();
        window.quadTVIframeHandler = handler;
      })();
    `;
  }

  sendToIframe(streamIndex, type, payload) {
    console.log(`📨 IframeBridge: Sending ${type} to iframe ${streamIndex}`);

    window.postMessage({
      type: type,
      payload: payload,
      source: 'QuadTV',
      target: 'iframe',
      streamIndex: streamIndex
    }, window.location.origin);
  }
}

// Initialize bridge when available
if (typeof window !== 'undefined') {
  window.QuadTVIframeBridge = IframeBridge;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IframeBridge;
}