import '@testing-library/jest-dom';

// jsdom does not implement ResizeObserver, which recharts'
// ResponsiveContainer relies on for measuring its parent.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined') {
  (window as any).ResizeObserver = window.ResizeObserver || ResizeObserverMock;
  // jsdom lacks matchMedia, used by responsive chart containers
  if (!window.matchMedia) {
    (window as any).matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
}