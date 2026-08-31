import '@testing-library/jest-dom/vitest';

// Mock ResizeObserver for Radix UI primitives (e.g., Slider, Select) & ECharts in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia for next-themes and responsive queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock HTMLCanvasElement.prototype.getContext for ECharts / ZRender rendering in jsdom
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextType: string) {
    if (contextType === '2d') {
      const baseCtx: Record<string, unknown> = {
        canvas: this,
        fillRect: () => {},
        clearRect: () => {},
        getImageData: (x: number, y: number, w: number, h: number) => ({
          data: new Array(w * h * 4),
        }),
        putImageData: () => {},
        createImageData: () => [],
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        fillText: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        strokeRect: () => {},
        fill: () => {},
        arc: () => {},
        rect: () => {},
        clip: () => {},
        measureText: () => ({ width: 0 }),
        transform: () => {},
        resetTransform: () => {},
        scale: () => {},
        rotate: () => {},
        translate: () => {},
        bezierCurveTo: () => {},
        quadraticCurveTo: () => {},
        createLinearGradient: () => ({
          addColorStop: () => {},
        }),
        createRadialGradient: () => ({
          addColorStop: () => {},
        }),
      };

      return new Proxy(baseCtx, {
        get(target, prop) {
          if (prop in target) {
            return target[prop as string];
          }
          // Default no-op function for any missing 2D context method
          return () => {};
        },
        set(target, prop, value) {
          target[prop as string] = value;
          return true;
        },
      }) as unknown as CanvasRenderingContext2D;
    }
    return null;
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
}
