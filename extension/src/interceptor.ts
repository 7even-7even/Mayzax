(function() {
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = args[0] instanceof Request ? args[0].url : args[0];
    const options = args[1] || {};
    const method = options.method || 'GET';

    window.dispatchEvent(new CustomEvent('MayzaxNetReq', { detail: { url, method } }));

    try {
      const response = await originalFetch(...args);
      const clone = response.clone();
      let text = '';
      try { text = await clone.text(); } catch {}
      
      window.dispatchEvent(new CustomEvent('MayzaxNetRes', {
        detail: { url, status: response.status, text }
      }));
      return response;
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('MayzaxNetRes', {
        detail: { url, status: 0, text: err.message || '' }
      }));
      throw err;
    }
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...rest: any[]) {
    (this as any)._url = url;
    (this as any)._method = method;
    return originalOpen.apply(this, [method, url, ...rest] as any);
  };

  XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
    const self = this as any;
    window.dispatchEvent(new CustomEvent('MayzaxNetReq', {
      detail: { url: self._url, method: self._method }
    }));

    self.addEventListener('load', function() {
      window.dispatchEvent(new CustomEvent('MayzaxNetRes', {
        detail: { url: self._url, status: self.status, text: self.responseText }
      }));
    });

    return originalSend.apply(this, [body] as any);
  };
})();
