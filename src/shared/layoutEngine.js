class LayoutEngine {
  constructor() {
    this.layouts = {
      '2x2': {
        name: '2x2 Grid',
        grid: 'repeat(2, 1fr)',
        streams: [
          { position: 1, gridArea: '1 / 1 / 2 / 2' },
          { position: 2, gridArea: '1 / 2 / 2 / 3' },
          { position: 3, gridArea: '2 / 1 / 3 / 2' },
          { position: 4, gridArea: '2 / 2 / 3 / 3' }
        ]
      },
      '1+3': {
        name: '1 Large + 3 Small',
        grid: 'repeat(2, 1fr) / repeat(2, 1fr)',
        streams: [
          { position: 1, gridArea: '1 / 1 / 3 / 2' },
          { position: 2, gridArea: '1 / 2 / 2 / 3' },
          { position: 3, gridArea: '2 / 2 / 3 / 3' },
          { position: 4, gridArea: '3 / 2 / 4 / 3' }
        ]
      },
      '2-vertical': {
        name: '2 Vertical',
        grid: '1fr / repeat(2, 1fr)',
        streams: [
          { position: 1, gridArea: '1 / 1 / 2 / 2' },
          { position: 2, gridArea: '1 / 2 / 2 / 3' }
        ]
      }
    };
  }

  getLayout(layoutType) {
    return this.layouts[layoutType] || this.layouts['2x2'];
  }

  getAvailableLayouts() {
    return Object.keys(this.layouts).map(key => ({
      key,
      name: this.layouts[key].name
    }));
  }

  generateCSS(layoutType) {
    const layout = this.getLayout(layoutType);
    return {
      container: {
        display: 'grid',
        gridTemplate: layout.grid,
        gap: '4px',
        width: '100%',
        height: '100vh'
      },
      streams: layout.streams
    };
  }
}

window.QuadTVLayoutEngine = window.QuadTVLayoutEngine || new LayoutEngine();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LayoutEngine };
}