if (typeof global.DOMException === 'undefined' || typeof globalThis.DOMException === 'undefined') {
  const DOMExceptionPolyfill = class DOMException extends Error {
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name ?? 'Error';
    }
  };
  (global as any).DOMException = DOMExceptionPolyfill;
  (globalThis as any).DOMException = DOMExceptionPolyfill;
}
