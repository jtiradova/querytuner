import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * Prototype reset hatch. Visiting any URL with `?reset=1` (or `?reset`) wipes
 * the persisted UI state (open chat panel, messages, tab counters, sidebar
 * collapse) and reloads onto a clean /editor. Handy during demos when the
 * chat panel keeps popping back open with stale state.
 */
(function handleResetParam() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('reset')) return;
  try {
    window.sessionStorage.clear();
    window.localStorage.removeItem('sidebar-collapsed');
  } catch {
    // ignore storage access failures
  }
  window.location.replace('/editor');
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
