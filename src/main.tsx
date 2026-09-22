import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
// @ts-ignore: Allow side-effect CSS import without type declarations
import './index.css'
import App from './App';

// Patch fetch and EventSource to support custom API URL if VITE_API_URL is set
const apiBase = (import.meta as any).env?.VITE_API_URL;
if (apiBase) {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
      input = `${cleanBase}${input}`;
    }
    return originalFetch(input, init);
  };

  const originalEventSource = window.EventSource;
  window.EventSource = function (url, eventSourceInitDict) {
    if (typeof url === 'string' && url.startsWith('/api/')) {
      const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
      url = `${cleanBase}${url}`;
    }
    return new originalEventSource(url, eventSourceInitDict);
  } as any;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
