/**
 * UIManager - Core UI management for QuadTV multi-stream interface
 *
 * Responsibilities:
 * - Create and manage iframe grid overlay
 * - Handle resizable dividers with drag-to-resize
 * - Manage keyboard shortcuts (Esc, Ctrl+Space, Alt+M, ?)
 * - Persist and restore grid sizing preferences
 * - Coordinate layout switching (2x2, 1+2, 2-vertical)
 *
 * @class
 */
class UIManager {
  /**
   * Initialize UIManager with default state and event listeners
   * Sets up message bus subscriptions, keyboard handlers, and loads saved grid ratios
   */
  constructor() {
    this.isActive = false;
    this.currentLayout = '2x2';
    this.container = null;
    this.messageBus = window.QuadTVMessageBus;
    this.layoutEngine = window.QuadTVLayoutEngine;
    this.iframes = []; // Store iframe references
    this.dividers = []; // Store divider elements
    this.isDragging = false;
    this.activeAudioStream = null; // Track which stream has audio focus

    // Grid ratios for each layout (fr units)
    this.gridRatios = {
      '2x2': { columns: [1, 1], rows: [1, 1] },
      '1+2': { columns: [2, 1], rows: [1, 1] },
      '2-vertical': { columns: [1, 1], rows: [1] }
    };

    this.init();
  }

  /**
   * Initialize UIManager by setting up listeners and loading persisted settings
   * @private
   */
  init() {
    this.setupMessageBusListeners();
    this.setupKeyboardShortcuts();
    this.loadGridRatios();
  }

  setupMessageBusListeners() {
    this.messageBus.subscribe('QUADTV_ACTIVATED', (data) => this.onQuadTVActivated(data));
    this.messageBus.subscribe('QUADTV_DEACTIVATED', () => this.deactivate());
    this.messageBus.subscribe('SET_LAYOUT', (data) => this.setLayout(data.layout));
    this.messageBus.subscribe('RESET_GRID', () => this.resetAllGridRatios());
  }

  setupKeyboardShortcuts() {
    this.keyboardHandler = (event) => this.handleKeyboardShortcut(event);
  }

  /**
   * Handle keyboard shortcuts for QuadTV
   * Supports: Esc (exit), Ctrl/Cmd+Space (cycle layouts), Alt+M (mute all), ? (help)
   * Ignores shortcuts when user is typing in text fields
   *
   * @param {KeyboardEvent} event - The keyboard event
   * @private
   */
  handleKeyboardShortcut(event) {
    if (!this.isActive) return;

    // Ignore if user is typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable) {
      return;
    }

    const key = event.key;

    // ESC to deactivate QuadTV
    if (key === 'Escape') {
      event.preventDefault();
      console.log('🎹 Keyboard shortcut: Deactivating QuadTV');
      this.messageBus.publish('QUADTV_DEACTIVATED');
      return;
    }

    // Space to toggle between layouts
    if (key === ' ' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      console.log('🎹 Keyboard shortcut: Cycling layout');
      this.cycleLayout();
      return;
    }

    // Alt+M to toggle mute all streams
    if ((key === 'm' || key === 'M') && event.altKey) {
      event.preventDefault();
      console.log('🎹 Keyboard shortcut: Toggle mute all streams');
      this.toggleMuteAllStreams();
      return;
    }

    // ? to show help
    if (key === '?' || key === '/') {
      event.preventDefault();
      console.log('🎹 Keyboard shortcut: Showing help');
      this.showOnboarding();
      return;
    }
  }

  /**
   * Cycle through available layouts in sequence: 2x2 → 1+2 → 2-vertical → 2x2
   * Updates the current layout and recreates the grid if active
   * @public
   */
  cycleLayout() {
    const layouts = ['2x2', '1+2', '2-vertical'];
    const currentIndex = layouts.indexOf(this.currentLayout);
    const nextIndex = (currentIndex + 1) % layouts.length;
    const nextLayout = layouts[nextIndex];

    console.log(`🔄 Cycling from ${this.currentLayout} to ${nextLayout}`);
    this.setLayout(nextLayout);
  }

  /**
   * Get the number of streams for a given layout
   * @param {string} layout - Layout key ('2x2', '1+2', '2-vertical')
   * @returns {number} Number of streams (2, 3, or 4)
   * @public
   */
  getStreamCountForLayout(layout) {
    const counts = {
      '2x2': 4,
      '1+2': 3,
      '2-vertical': 2
    };
    return counts[layout] || 4;
  }

  showOnboardingIfNeeded() {
    try {
      const hasSeenOnboarding = localStorage.getItem('quadtv-onboarding-seen');
      if (!hasSeenOnboarding) {
        setTimeout(() => this.showOnboarding(), 1000);
        localStorage.setItem('quadtv-onboarding-seen', 'true');
      }
    } catch (error) {
      console.warn('Failed to check onboarding state:', error);
    }
  }

  showOnboarding() {
    const helpOverlay = document.createElement('div');
    helpOverlay.id = 'quadtv-onboarding';
    helpOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10002;
      font-family: Arial, sans-serif;
    `;

    const helpContent = document.createElement('div');
    helpContent.style.cssText = `
      background: #1a1a1a;
      border: 2px solid #ff0000;
      border-radius: 8px;
      padding: 24px;
      max-width: 500px;
      color: white;
      text-align: center;
    `;

    helpContent.innerHTML = `
      <h2 style="color: #ff0000; margin-top: 0;">🎬 Welcome to QuadTV!</h2>
      <div style="text-align: left; margin: 16px 0;">
        <h3>🎹 Keyboard Shortcuts:</h3>
        <p><strong>Ctrl/Cmd + Space</strong> - Cycle layouts (2x2, 1+2, 2-vertical)</p>
        <p><strong>Alt + M</strong> - Mute/unmute all streams</p>
        <p><strong>Esc</strong> - Exit QuadTV</p>
        <p><strong>?</strong> - Show this help</p>

        <h3>🔀 Stream Swapping:</h3>
        <p><strong>Drag streams</strong> to swap their positions</p>
        <p>Hover over a stream and drag the ⇄ button</p>
        <p>Drop on another stream to swap channels</p>

        <h3>📏 Resizable Grid:</h3>
        <p><strong>Drag dividers</strong> between streams to resize</p>
        <p><strong>Double-click divider</strong> to reset to equal sizing</p>
        <p>Each layout remembers its own sizing preferences</p>
      </div>
      <button id="quadtv-help-close" style="
        background: #ff0000;
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      ">Got it!</button>
    `;

    helpOverlay.appendChild(helpContent);
    document.body.appendChild(helpOverlay);

    const closeHelp = () => {
      if (helpOverlay.parentNode) {
        helpOverlay.parentNode.removeChild(helpOverlay);
      }
    };

    helpContent.querySelector('#quadtv-help-close').addEventListener('click', closeHelp);
    helpOverlay.addEventListener('click', (e) => {
      if (e.target === helpOverlay) closeHelp();
    });

    setTimeout(closeHelp, 10000);
  }

  /**
   * Handle QUADTV_ACTIVATED message to create the multi-stream grid
   * Updates layout if specified, stores current video URL if provided
   *
   * @param {Object} data - Activation data
   * @param {string} [data.layout] - Layout to use ('2x2', '1+2', '2-vertical')
   * @param {string} [data.currentVideoUrl] - Current video URL to preserve
   * @public
   */
  onQuadTVActivated(data) {
    console.log('📺 QuadTV: Activating iframe grid', data);

    if (data.layout) {
      this.currentLayout = data.layout;
      console.log(`📐 UI: Layout set to ${data.layout}`);
    }

    // Store current video URL if provided
    if (data.currentVideoUrl) {
      this.currentVideoUrl = data.currentVideoUrl;
      console.log('📺 UI: Current video URL:', this.currentVideoUrl);
    }

    if (this.isActive) {
      if (data.layout) {
        console.log(`📐 UI: Already active, updating layout to ${data.layout}`);
        this.setLayout(data.layout);
      }
    } else {
      this.activate();
    }
  }

  /**
   * Activate QuadTV by creating the grid and enabling keyboard shortcuts
   * Publishes UI_ACTIVATED message when complete
   * @private
   */
  activate() {
    if (this.isActive) return;

    this.createQuadTVGrid();
    this.isActive = true;

    // Add keyboard shortcuts
    document.addEventListener('keydown', this.keyboardHandler, { capture: true, passive: false });

    console.log('📺 Tab: QuadTV grid activated');
    this.messageBus.publish('UI_ACTIVATED');
  }

  /**
   * Deactivate QuadTV by removing the grid, cleaning up resources, and disabling shortcuts
   * Publishes UI_DEACTIVATED message when complete
   * @public
   */
  deactivate() {
    if (!this.isActive) return;

    // Remove keyboard shortcuts
    document.removeEventListener('keydown', this.keyboardHandler, { capture: true, passive: false });

    // Remove QuadTV grid
    this.removeQuadTVGrid();

    // Reset current video URL
    this.currentVideoUrl = null;

    this.isActive = false;

    console.log('📺 Tab: QuadTV grid deactivated');
    this.messageBus.publish('UI_DEACTIVATED');
  }

  createQuadTVGrid() {
    // Create main container
    this.quadTVContainer = document.createElement('div');
    this.quadTVContainer.id = 'quadtv-container';

    // Create grid container
    this.gridContainer = document.createElement('div');
    this.gridContainer.className = 'quadtv-grid-container';
    this.gridContainer.setAttribute('data-layout', this.currentLayout);

    // Create maximum stream containers (4) and show/hide based on layout
    this.streams = [];
    const maxStreams = 4;

    for (let i = 0; i < maxStreams; i++) {
      const streamContainer = this.createStreamContainer(i);
      this.streams.push(streamContainer);
      this.gridContainer.appendChild(streamContainer);
    }

    this.quadTVContainer.appendChild(this.gridContainer);
    document.body.appendChild(this.quadTVContainer);

    // Apply initial layout
    this.updateGridLayout(this.currentLayout);

    // Show onboarding help if first time user
    this.showOnboardingIfNeeded();

    console.log('📺 QuadTV grid created');
  }

  createStreamContainer(index) {
    const container = document.createElement('div');
    container.className = 'quadtv-stream';
    container.dataset.streamIndex = index;

    // Make container draggable for stream swapping
    container.draggable = true;

    console.log(`📺 UI: Creating stream ${index}, currentVideoUrl:`, this.currentVideoUrl);

    // Create iframe for YouTube TV
    const iframe = document.createElement('iframe');
    iframe.className = 'quadtv-iframe';

    // If this is the first stream and we have a current video URL, use it
    if (index === 0 && this.currentVideoUrl) {
      iframe.src = this.currentVideoUrl;
      console.log('✅ UI: Setting first iframe to current video:', this.currentVideoUrl);

      // Mute/stop any video playing in the background page
      this.stopBackgroundVideo();
    } else {
      iframe.src = 'https://tv.youtube.com';
      console.log(`📺 UI: Setting stream ${index} to home page (iframe)`);
    }

    iframe.allow = 'autoplay; fullscreen';
    iframe.setAttribute('loading', 'lazy');
    iframe.dataset.streamIndex = index;

    // Store iframe reference
    this.iframes[index] = iframe;

    container.appendChild(iframe);

    // Create stream number indicator
    const streamNumber = document.createElement('div');
    streamNumber.className = 'stream-number';
    streamNumber.textContent = `${index + 1}`;

    // Add click handler for audio focus
    container.addEventListener('click', (e) => {
      // Only trigger if clicking on the container or stream number, not the iframe
      if (e.target === container || e.target === streamNumber) {
        this.setAudioFocus(index);
      }
    });

    container.appendChild(streamNumber);

    // Add swap button for easier stream swapping on mobile/touch devices
    const swapButton = document.createElement('button');
    swapButton.className = 'stream-swap-button';
    swapButton.innerHTML = '⇄';
    swapButton.title = 'Drag to swap streams';
    swapButton.setAttribute('draggable', 'true');

    // Drag and drop handlers for stream swapping
    this.setupStreamSwapHandlers(container, swapButton, index);

    container.appendChild(swapButton);

    return container;
  }

  /**
   * Setup drag and drop handlers for stream swapping
   * @param {HTMLElement} container - Stream container element
   * @param {HTMLElement} swapButton - Swap button element
   * @param {number} index - Stream index
   * @private
   */
  setupStreamSwapHandlers(container, swapButton, index) {
    // Dragstart - when starting to drag this stream
    const onDragStart = (e) => {
      this.draggedStreamIndex = index;
      container.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', container.innerHTML);

      // CRITICAL FIX: Disable pointer-events on ALL iframes to allow drop events
      const allIframes = document.querySelectorAll('.quadtv-iframe');
      allIframes.forEach(iframe => {
        iframe.style.pointerEvents = 'none';
      });

      console.log(`🔀 Started dragging stream ${index + 1}`);
    };

    // Dragover - when dragging over this stream
    const onDragOver = (e) => {
      if (e.preventDefault) {
        e.preventDefault();
      }
      e.dataTransfer.dropEffect = 'move';

      // Add visual feedback
      if (this.draggedStreamIndex !== undefined && this.draggedStreamIndex !== index) {
        container.classList.add('drag-over');
      }
      return false;
    };

    // Dragleave - when leaving this stream
    const onDragLeave = (e) => {
      // Only remove if we're actually leaving the container
      if (!container.contains(e.relatedTarget)) {
        container.classList.remove('drag-over');
      }
    };

    // Drop - when dropping on this stream
    const onDrop = (e) => {
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      e.preventDefault();

      container.classList.remove('drag-over');

      // Swap streams if dropping on a different stream
      if (this.draggedStreamIndex !== undefined && this.draggedStreamIndex !== index) {
        this.swapStreams(this.draggedStreamIndex, index);
      }

      return false;
    };

    // Dragend - when drag operation ends
    const onDragEnd = (e) => {
      container.classList.remove('dragging');
      container.classList.remove('drag-over');

      // Remove drag-over class from all streams
      const allStreams = document.querySelectorAll('.quadtv-stream');
      allStreams.forEach(s => s.classList.remove('drag-over'));

      // CRITICAL FIX: Re-enable pointer-events on all iframes
      const allIframes = document.querySelectorAll('.quadtv-iframe');
      allIframes.forEach(iframe => {
        iframe.style.pointerEvents = 'auto';
      });

      this.draggedStreamIndex = undefined;
      console.log('🔀 Drag ended');
    };

    // Attach handlers to container
    container.addEventListener('dragstart', onDragStart);
    container.addEventListener('dragover', onDragOver);
    container.addEventListener('dragleave', onDragLeave);
    container.addEventListener('drop', onDrop);
    container.addEventListener('dragend', onDragEnd);

    // Also attach to swap button for easier grabbing
    swapButton.addEventListener('dragstart', onDragStart);
  }

  /**
   * Swap two streams by exchanging their iframe sources
   * @param {number} index1 - First stream index
   * @param {number} index2 - Second stream index
   * @public
   */
  swapStreams(index1, index2) {
    console.log(`🔀 Swapping streams ${index1 + 1} and ${index2 + 1}`);

    const iframe1 = this.iframes[index1];
    const iframe2 = this.iframes[index2];

    if (!iframe1 || !iframe2) {
      console.warn('Cannot swap: iframes not found');
      return;
    }

    // Swap iframe sources
    const tempSrc = iframe1.src;
    iframe1.src = iframe2.src;
    iframe2.src = tempSrc;

    console.log(`✅ Swapped stream ${index1 + 1} (${iframe2.src}) ↔ stream ${index2 + 1} (${iframe1.src})`);

    // Show feedback to user
    this.showSwapFeedback(index1, index2);
  }

  /**
   * Show visual feedback when streams are swapped
   * @param {number} index1 - First stream index
   * @param {number} index2 - Second stream index
   * @private
   */
  showSwapFeedback(index1, index2) {
    const streams = document.querySelectorAll('.quadtv-stream');
    const stream1 = streams[index1];
    const stream2 = streams[index2];

    if (stream1 && stream2) {
      // Flash effect
      stream1.classList.add('stream-swapped');
      stream2.classList.add('stream-swapped');

      setTimeout(() => {
        stream1.classList.remove('stream-swapped');
        stream2.classList.remove('stream-swapped');
      }, 600);
    }
  }

  stopBackgroundVideo() {
    try {
      // Find all video elements in the main page and pause them
      const videos = document.querySelectorAll('video');
      videos.forEach((video, index) => {
        if (!video.paused) {
          video.pause();
          video.muted = true;
          console.log(`🔇 UI: Paused and muted background video ${index + 1}`);
        }
      });

      // Hide the main YouTube TV content to prevent interaction
      const yttvApp = document.querySelector('ytlr-app');
      if (yttvApp) {
        yttvApp.style.display = 'none';
        this.hiddenYttvApp = yttvApp; // Store reference for restoration
        console.log('📺 UI: Hidden main YouTube TV app');
      }
    } catch (error) {
      console.warn('Failed to stop background video:', error);
    }
  }

  removeQuadTVGrid() {
    if (this.quadTVContainer) {
      // Restore hidden YouTube TV app
      if (this.hiddenYttvApp) {
        this.hiddenYttvApp.style.display = '';
        this.hiddenYttvApp = null;
        console.log('📺 UI: Restored YouTube TV app visibility');
      }

      this.quadTVContainer.remove();
      this.quadTVContainer = null;
      this.gridContainer = null;
      this.streams = [];
      this.iframes = [];
    }
  }

  /**
   * Change the current layout and update the grid if active
   * Stores layout preference even when inactive for next activation
   *
   * @param {string} layout - Layout key ('2x2', '1+2', '2-vertical')
   * @public
   */
  setLayout(layout) {
    console.log(`📐 UI: Setting layout to ${layout}`);
    this.currentLayout = layout;

    if (!this.isActive) {
      console.log('📐 UI: QuadTV not active, storing layout preference');
      return;
    }

    this.updateGridLayout(layout);
    console.log(`✅ UI: Layout changed to ${layout}`);
  }

  updateGridLayout(layout) {
    const gridContainer = document.querySelector('.quadtv-grid-container');
    if (!gridContainer) {
      console.warn('📐 UI: Grid container not found');
      return;
    }

    // Store reference for applyGridRatios
    this.gridContainer = gridContainer;

    // Set layout data attribute for CSS styling
    gridContainer.setAttribute('data-layout', layout);
    console.log(`📐 UI: Set data-layout="${layout}" on grid container`);

    // Apply basic grid setup
    Object.assign(gridContainer.style, {
      display: 'grid',
      width: '100%',
      height: '100%',
      gap: '8px'
    });

    // Apply saved grid ratios for this layout (or defaults if none saved)
    this.applyGridRatios();

    // Show/hide streams based on layout requirements
    const requiredStreams = this.getStreamCountForLayout(layout);
    const allStreams = document.querySelectorAll('.quadtv-stream');

    allStreams.forEach((stream, index) => {
      if (index < requiredStreams) {
        stream.style.display = 'block';
        console.log(`📐 UI: Showing stream ${index}`);
      } else {
        stream.style.display = 'none';
        console.log(`📐 UI: Hiding stream ${index}`);
      }
    });

    console.log(`📐 UI: Grid layout updated to ${layout} with ${requiredStreams} streams`);

    // Update dividers for new layout
    this.updateDividers(layout);
  }

  // ===== RESIZABLE DIVIDERS =====

  createDividers(layout) {
    // Remove existing dividers
    this.removeDividers();

    if (layout === '2x2') {
      // Create vertical divider (between left and right columns)
      const verticalDivider = this.createDivider('vertical', 0);
      this.dividers.push(verticalDivider);
      this.quadTVContainer.appendChild(verticalDivider);

      // Create horizontal divider (between top and bottom rows)
      const horizontalDivider = this.createDivider('horizontal', 0);
      this.dividers.push(horizontalDivider);
      this.quadTVContainer.appendChild(horizontalDivider);

      console.log('📏 Created dividers for 2x2 layout');
    } else if (layout === '2-vertical') {
      // Create single vertical divider (between left and right streams)
      const verticalDivider = this.createDivider('vertical', 0);
      this.dividers.push(verticalDivider);
      this.quadTVContainer.appendChild(verticalDivider);

      console.log('📏 Created vertical divider for 2-vertical layout');
    } else if (layout === '1+2') {
      // Create vertical divider (between large stream and small streams)
      const verticalDivider = this.createDivider('vertical', 0);
      this.dividers.push(verticalDivider);
      this.quadTVContainer.appendChild(verticalDivider);

      // Create horizontal divider (between two small streams on right)
      const horizontalDivider = this.createDivider('horizontal', 0);
      this.dividers.push(horizontalDivider);
      this.quadTVContainer.appendChild(horizontalDivider);

      console.log('📏 Created dividers for 1+2 layout');
    }

    // Position dividers based on current ratios
    this.positionDividers();
  }

  createDivider(orientation, index) {
    const divider = document.createElement('div');
    divider.className = `quadtv-divider quadtv-divider-${orientation}`;
    divider.dataset.orientation = orientation;
    divider.dataset.index = index;

    // Add drag event listeners
    divider.addEventListener('mousedown', (e) => this.onDividerDragStart(e, divider));

    // Double-click to reset
    divider.addEventListener('dblclick', () => this.resetDivider(orientation));

    return divider;
  }

  removeDividers() {
    this.dividers.forEach(divider => divider.remove());
    this.dividers = [];
  }

  updateDividers(layout) {
    this.createDividers(layout);
  }

  positionDividers() {
    const layout = this.currentLayout;
    const ratios = this.gridRatios[layout];

    if (!ratios) return;

    // Position vertical divider (if exists)
    const verticalDivider = this.dividers.find(d => d.dataset.orientation === 'vertical');
    if (verticalDivider && ratios.columns) {
      const totalColumns = ratios.columns.reduce((a, b) => a + b, 0);
      const leftPercent = (ratios.columns[0] / totalColumns) * 100;
      verticalDivider.style.left = `calc(${leftPercent}% - 4px)`;
      verticalDivider.style.top = '0';
      verticalDivider.style.bottom = '0';
    }

    // Position horizontal divider (if exists)
    const horizontalDivider = this.dividers.find(d => d.dataset.orientation === 'horizontal');
    if (horizontalDivider && ratios.rows) {
      const totalRows = ratios.rows.reduce((a, b) => a + b, 0);
      const topPercent = (ratios.rows[0] / totalRows) * 100;
      horizontalDivider.style.top = `calc(${topPercent}% - 4px)`;

      // For 1+2 layout, constrain horizontal divider to right column only
      if (layout === '1+2') {
        const totalColumns = ratios.columns.reduce((a, b) => a + b, 0);
        const rightColumnStart = (ratios.columns[0] / totalColumns) * 100;
        horizontalDivider.style.left = `${rightColumnStart}%`;
        horizontalDivider.style.right = '0';
      } else {
        horizontalDivider.style.left = '0';
        horizontalDivider.style.right = '0';
      }
    }
  }

  onDividerDragStart(e, divider) {
    e.preventDefault();
    e.stopPropagation();

    this.isDragging = true;
    this.dragOrientation = divider.dataset.orientation;
    this.dragStartPos = this.dragOrientation === 'vertical' ? e.clientX : e.clientY;
    this.dragStartRatios = JSON.parse(JSON.stringify(this.gridRatios[this.currentLayout]));

    // Add dragging class for visual feedback
    divider.classList.add('dragging');
    this.currentDragDivider = divider;

    // Block pointer events on iframes during drag to prevent losing mouse events
    document.querySelectorAll('.quadtv-iframe').forEach(iframe => {
      iframe.style.pointerEvents = 'none';
    });

    // Bind event handlers
    this.boundDividerDrag = (e) => this.onDividerDrag(e);
    this.boundDividerDragEnd = (e) => this.onDividerDragEnd(e);

    // Listen on document for better drag handling
    document.addEventListener('mousemove', this.boundDividerDrag, { capture: true });
    document.addEventListener('mouseup', this.boundDividerDragEnd, { capture: true, once: true });

    console.log(`📏 Started dragging ${this.dragOrientation} divider`);
  }

  onDividerDrag(e) {
    if (!this.isDragging) return;

    e.preventDefault();
    e.stopPropagation();

    const currentPos = this.dragOrientation === 'vertical' ? e.clientX : e.clientY;
    const delta = currentPos - this.dragStartPos;

    // Convert pixel delta to ratio change
    const containerSize = this.dragOrientation === 'vertical'
      ? this.gridContainer.offsetWidth
      : this.gridContainer.offsetHeight;

    const ratioDelta = delta / containerSize;

    // Update ratios with min/max constraints
    this.updateGridRatios(ratioDelta);

    // Apply new ratios to grid
    this.applyGridRatios();

    // Update divider positions
    this.positionDividers();
  }

  onDividerDragEnd(e) {
    console.log('📏 onDividerDragEnd called, isDragging:', this.isDragging);

    if (!this.isDragging) return;

    e.preventDefault();
    e.stopPropagation();

    this.isDragging = false;

    // Remove dragging class
    if (this.currentDragDivider) {
      this.currentDragDivider.classList.remove('dragging');
      this.currentDragDivider = null;
    }

    // Re-enable pointer events on iframes
    document.querySelectorAll('.quadtv-iframe').forEach(iframe => {
      iframe.style.pointerEvents = 'auto';
    });

    // Remove mousemove listener (mouseup already removed via 'once' option)
    document.removeEventListener('mousemove', this.boundDividerDrag, { capture: true });

    // Save ratios to localStorage
    this.saveGridRatios();

    console.log(`📏 ✅ Finished dragging ${this.dragOrientation} divider`);
  }

  updateGridRatios(ratioDelta) {
    const layout = this.currentLayout;
    const ratios = this.gridRatios[layout];
    const startRatios = this.dragStartRatios;

    const MIN_RATIO = 0.3;
    const MAX_RATIO = 3.0;

    if (this.dragOrientation === 'vertical' && ratios.columns) {
      // Adjust column ratios
      const newFirst = Math.max(MIN_RATIO, Math.min(MAX_RATIO, startRatios.columns[0] + ratioDelta * 2));
      const newSecond = Math.max(MIN_RATIO, Math.min(MAX_RATIO, startRatios.columns[1] - ratioDelta * 2));

      ratios.columns[0] = newFirst;
      ratios.columns[1] = newSecond;
    } else if (this.dragOrientation === 'horizontal' && ratios.rows) {
      // Adjust row ratios
      const newFirst = Math.max(MIN_RATIO, Math.min(MAX_RATIO, startRatios.rows[0] + ratioDelta * 2));
      const newSecond = Math.max(MIN_RATIO, Math.min(MAX_RATIO, startRatios.rows[1] - ratioDelta * 2));

      ratios.rows[0] = newFirst;
      ratios.rows[1] = newSecond;
    }
  }

  applyGridRatios() {
    const layout = this.currentLayout;
    const ratios = this.gridRatios[layout];

    if (!ratios) return;

    const columnTemplate = ratios.columns.map(r => `${r}fr`).join(' ');
    const rowTemplate = ratios.rows.map(r => `${r}fr`).join(' ');

    this.gridContainer.style.gridTemplateColumns = columnTemplate;
    this.gridContainer.style.gridTemplateRows = rowTemplate;
  }

  resetDivider(orientation) {
    // Reset to default 1:1 ratio
    const layout = this.currentLayout;
    const ratios = this.gridRatios[layout];

    if (orientation === 'vertical' && ratios.columns) {
      ratios.columns = [1, 1];
    } else if (orientation === 'horizontal' && ratios.rows) {
      ratios.rows = [1, 1];
    }

    this.applyGridRatios();
    this.positionDividers();
    this.saveGridRatios();

    console.log(`📏 Reset ${orientation} divider to default`);
  }

  loadGridRatios() {
    try {
      const saved = localStorage.getItem('quadtv-grid-ratios');
      if (saved) {
        this.gridRatios = JSON.parse(saved);
        console.log('📏 Loaded saved grid ratios');
      }
    } catch (error) {
      console.warn('Failed to load grid ratios:', error);
    }
  }

  saveGridRatios() {
    try {
      localStorage.setItem('quadtv-grid-ratios', JSON.stringify(this.gridRatios));
      console.log('📏 Saved grid ratios');
    } catch (error) {
      console.warn('Failed to save grid ratios:', error);
    }
  }

  resetAllGridRatios() {
    // Reset all layouts to default 1:1 ratios
    this.gridRatios = {
      '2x2': { columns: [1, 1], rows: [1, 1] },
      '1+2': { columns: [2, 1], rows: [1, 1] },
      '2-vertical': { columns: [1, 1], rows: [1] }
    };

    // Apply to current layout if active
    if (this.isActive) {
      this.applyGridRatios();
      this.positionDividers();
    }

    // Save reset ratios
    this.saveGridRatios();

    console.log('📏 Reset all grid ratios to defaults');
  }

  // ===== AUDIO CONTROL =====

  /**
   * Wait for iframe to be ready and YouTube TV controls to be loaded
   */
  waitForIframeReady(iframe, timeout = 10000) {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkReady = () => {
        try {
          // Check if iframe contentWindow is accessible
          if (!iframe.contentWindow || !iframe.contentWindow.document) {
            if (Date.now() - startTime < timeout) {
              setTimeout(checkReady, 100);
            } else {
              resolve(false);
            }
            return;
          }

          // Check if volume button exists in the DOM
          const volumeButton = iframe.contentWindow.document.querySelector('ytu-icon-button.ypc-volume-button button');

          if (volumeButton) {
            resolve(true);
          } else if (Date.now() - startTime < timeout) {
            setTimeout(checkReady, 100);
          } else {
            resolve(false);
          }
        } catch (error) {
          if (Date.now() - startTime < timeout) {
            setTimeout(checkReady, 100);
          } else {
            resolve(false);
          }
        }
      };

      checkReady();
    });
  }

  /**
   * Toggle mute for a specific stream
   */
  async toggleMuteForStream(streamIndex) {
    const iframe = this.iframes[streamIndex];
    if (!iframe) {
      console.warn(`Stream ${streamIndex} not found`);
      return false;
    }

    // Wait for iframe to be ready
    const isReady = await this.waitForIframeReady(iframe);
    if (!isReady) {
      console.warn(`Stream ${streamIndex} controls not ready`);
      return false;
    }

    try {
      const iframeDoc = iframe.contentWindow.document;
      const volumeButton = iframeDoc.querySelector('ytu-icon-button.ypc-volume-button button');

      if (volumeButton) {
        volumeButton.click();
        console.log(`🔊 Toggled mute for stream ${streamIndex}`);
        return true;
      } else {
        console.warn(`Volume button not found in stream ${streamIndex}`);
        return false;
      }
    } catch (error) {
      console.error(`Error toggling mute for stream ${streamIndex}:`, error);
      return false;
    }
  }

  /**
   * Ensure a stream is muted
   */
  async ensureMuted(streamIndex) {
    const iframe = this.iframes[streamIndex];
    if (!iframe) return false;

    const isReady = await this.waitForIframeReady(iframe);
    if (!isReady) return false;

    try {
      const iframeDoc = iframe.contentWindow.document;
      const volumeButton = iframeDoc.querySelector('ytu-icon-button.ypc-volume-button button');

      if (volumeButton) {
        const ariaLabel = volumeButton.getAttribute('aria-label') || '';
        // If aria-label contains "Mute (m)", audio is ON, so click to mute
        if (ariaLabel.includes('Mute (m)')) {
          volumeButton.click();
          console.log(`🔇 Muted stream ${streamIndex}`);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error(`Error muting stream ${streamIndex}:`, error);
      return false;
    }
  }

  /**
   * Ensure a stream is unmuted
   */
  async ensureUnmuted(streamIndex) {
    const iframe = this.iframes[streamIndex];
    if (!iframe) return false;

    const isReady = await this.waitForIframeReady(iframe);
    if (!isReady) return false;

    try {
      const iframeDoc = iframe.contentWindow.document;
      const volumeButton = iframeDoc.querySelector('ytu-icon-button.ypc-volume-button button');

      if (volumeButton) {
        const ariaLabel = volumeButton.getAttribute('aria-label') || '';
        // If aria-label contains "Unmute (m)", audio is OFF, so click to unmute
        if (ariaLabel.includes('Unmute (m)')) {
          volumeButton.click();
          console.log(`🔊 Unmuted stream ${streamIndex}`);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error(`Error unmuting stream ${streamIndex}:`, error);
      return false;
    }
  }

  /**
   * Set audio focus to a specific stream (mutes all others)
   */
  async setAudioFocus(streamIndex) {
    const streamCount = this.getStreamCountForLayout(this.currentLayout);

    console.log(`🎧 Setting audio focus to stream ${streamIndex}`);

    // Mute all streams first
    const mutePromises = [];
    for (let i = 0; i < streamCount; i++) {
      if (i !== streamIndex) {
        mutePromises.push(this.ensureMuted(i));
      }
    }

    // Wait for all mutes to complete
    await Promise.all(mutePromises);

    // Unmute the target stream
    await this.ensureUnmuted(streamIndex);

    // Update active stream tracking
    this.activeAudioStream = streamIndex;

    // Update visual indicators
    this.updateAudioFocusIndicators();
  }

  /**
   * Mute or unmute all streams
   */
  async muteAllStreams(shouldMute = true) {
    const streamCount = this.getStreamCountForLayout(this.currentLayout);
    const action = shouldMute ? 'Muting' : 'Unmuting';

    console.log(`🔇 ${action} all streams`);

    const promises = [];
    for (let i = 0; i < streamCount; i++) {
      if (shouldMute) {
        promises.push(this.ensureMuted(i));
      } else {
        promises.push(this.ensureUnmuted(i));
      }
    }

    await Promise.all(promises);

    if (shouldMute) {
      this.activeAudioStream = null;
      this.updateAudioFocusIndicators();
    }
  }

  /**
   * Toggle mute for all streams (used by Alt+M shortcut)
   */
  async toggleMuteAllStreams() {
    // If there's an active audio stream, mute all. Otherwise, unmute all.
    const shouldMute = this.activeAudioStream !== null;
    await this.muteAllStreams(shouldMute);
  }

  /**
   * Update visual indicators for audio focus
   */
  updateAudioFocusIndicators() {
    const streams = document.querySelectorAll('.quadtv-stream');

    streams.forEach((stream, index) => {
      if (index === this.activeAudioStream) {
        stream.classList.add('audio-focus');
      } else {
        stream.classList.remove('audio-focus');
      }
    });
  }
}

window.QuadTVUIManager = new UIManager();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UIManager };
}
