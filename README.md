# QuadTV

A Firefox extension that enables multi-stream viewing for YouTube TV, transforming the web interface into a visual grid of iframe streams with manual audio control and customizable layouts.

## Features

- **One-Click Activation**: Transform YouTube TV into multi-view mode instantly from the toolbar icon
- **Multiple Layouts**: Choose from three layouts:
  - **2x2 Grid** - 4 equal streams
  - **1+2 Layout** - 1 large stream + 2 smaller streams
  - **2-Vertical** - 2 side-by-side streams
- **Resizable Grid Dividers**: Drag dividers to customize stream sizes
  - Each layout remembers its own sizing preferences
  - Double-click dividers to reset to defaults
- **Stream Swapping**: Drag and drop streams to reorder channels
  - Hover over a stream and drag the ⇄ button
  - Visual feedback during drag and drop
- **Keyboard Shortcuts**:
  - **Esc** - Exit QuadTV mode
  - **Ctrl/Cmd+Space** - Cycle through layouts
  - **Alt+M** - Mute all streams
  - **?** - Show help overlay
- **First-Time Tutorial**: Onboarding overlay with tips and shortcuts

## Development

### Prerequisites

- Node.js 16+
- Firefox Developer Edition (recommended)

### Setup

```bash
npm install
```

### Available Scripts

```bash
# Run extension in development mode
npm run dev

# Build extension for distribution
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint
```

### Architecture

The extension follows a modular, iframe-based architecture:

- **BackgroundController**: Handles browser events and toolbar interactions
- **UIManager**: Controls iframe grid creation, resizable dividers, and visual elements
- **LayoutEngine**: Provides layout definitions and CSS Grid generation
- **StorageManager**: Handles data persistence for settings and grid sizing
- **MessageBus**: Central communication hub between components
- **ContentScript**: Message relay between background and UI manager

### Testing

Run the test suite with:

```bash
npm test
```

Tests are organized into:
- **Unit tests**: Individual component testing
- **Integration tests**: Cross-component interaction testing

### Contributing

1. Follow the existing code style and architecture patterns
2. Write tests for new features
3. Test manually on YouTube TV before submitting
4. Ensure all tests pass and linting is clean

## Installation

### Development

1. Clone the repository
2. Run `npm install`
3. Run `npm run build`
4. Load the `dist` folder as a temporary add-on in Firefox

### From Firefox Add-ons (Coming Soon)

The extension will be available on the Firefox Add-ons store once released.

## Usage

1. Navigate to [YouTube TV](https://tv.youtube.com)
2. Click the QuadTV toolbar icon to activate multi-view mode
3. Choose your preferred layout from the popup (2x2, 1+2, or 2-Vertical)
4. Each iframe displays YouTube TV - navigate to different channels in each stream
5. **Drag dividers** to resize streams to your preference
6. Click **Reset Grid Sizing** in the popup to restore default proportions
7. Control audio manually within each stream (click volume in each iframe)
8. Press **Esc** to exit QuadTV mode

## License

MIT