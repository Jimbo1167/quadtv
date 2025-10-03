# QuadTV

A Firefox extension that enables multi-stream viewing for YouTube TV, transforming the web interface into a visual grid of iframe streams with manual audio control and customizable layouts.

## Features

- **One-Click Activation**: Transform YouTube TV into multi-view mode instantly
- **Multiple Layouts**: Choose from 2x2 grid, 1+3 layout, or 2-vertical arrangement
- **Manual Audio Control**: Click audio buttons (🔊) to switch between stream audio
- **Focus Mode**: Maximize individual streams for detail viewing
- **Layout Presets**: Save and load custom channel configurations
- **Keyboard Shortcuts**: Quick toggle with Ctrl+Shift+Q

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
- **UIManager**: Controls iframe grid creation and visual elements
- **LayoutEngine**: Provides layout definitions and CSS Grid generation
- **StorageManager**: Handles data persistence for settings and presets
- **MessageBus**: Central communication hub between components
- **IframeBridge**: Manages communication with YouTube TV iframes

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
2. Click the QuadTV toolbar icon or press Ctrl+Shift+Q
3. Choose your preferred layout from the popup
4. Navigate each iframe to different content manually
5. Click 🔊 audio buttons to switch between stream audio
6. Hover over streams for additional controls

## License

MIT