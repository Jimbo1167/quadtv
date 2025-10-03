// LayoutEngine test file

// Mock browser APIs
global.browser = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

// Import LayoutEngine for testing
const { LayoutEngine } = require('../../src/shared/layoutEngine.js');

describe('LayoutEngine', () => {
  let layoutEngine;

  beforeEach(() => {
    layoutEngine = new LayoutEngine();
  });

  test('should have default layouts defined', () => {
    expect(layoutEngine.layouts).toBeDefined();
    expect(layoutEngine.layouts['2x2']).toBeDefined();
    expect(layoutEngine.layouts['1+2']).toBeDefined();
    expect(layoutEngine.layouts['2-vertical']).toBeDefined();
  });

  test('should return 2x2 layout by default', () => {
    const layout = layoutEngine.getLayout('non-existent');
    expect(layout).toEqual(layoutEngine.layouts['2x2']);
  });

  test('should return specific layout when requested', () => {
    const layout = layoutEngine.getLayout('1+2');
    expect(layout).toEqual(layoutEngine.layouts['1+2']);
    expect(layout.name).toBe('1 Large + 2 Small');
  });

  test('should return available layouts list', () => {
    const layouts = layoutEngine.getAvailableLayouts();
    expect(layouts).toHaveLength(3);
    expect(layouts[0]).toHaveProperty('key');
    expect(layouts[0]).toHaveProperty('name');
  });

  test('should generate CSS for 2x2 layout', () => {
    const css = layoutEngine.generateCSS('2x2');

    expect(css.container).toHaveProperty('display', 'grid');
    expect(css.container).toHaveProperty('gridTemplate');
    expect(css.streams).toHaveLength(4);

    css.streams.forEach((stream, index) => {
      expect(stream).toHaveProperty('position', index + 1);
      expect(stream).toHaveProperty('gridArea');
    });
  });

  test('should generate CSS for 1+2 layout', () => {
    const css = layoutEngine.generateCSS('1+2');

    expect(css.container).toHaveProperty('display', 'grid');
    expect(css.streams).toHaveLength(3);
    expect(css.streams[0].gridArea).toBe('1 / 1 / 3 / 2'); // Large stream
  });

  test('should generate CSS for 2-vertical layout', () => {
    const css = layoutEngine.generateCSS('2-vertical');

    expect(css.container).toHaveProperty('display', 'grid');
    expect(css.streams).toHaveLength(2);
  });

  test('should fallback to 2x2 for invalid layout in CSS generation', () => {
    const css = layoutEngine.generateCSS('invalid-layout');
    const css2x2 = layoutEngine.generateCSS('2x2');

    expect(css).toEqual(css2x2);
  });
});