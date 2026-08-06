import { Platform } from 'react-native';

/** Registers the app-shell service worker. No-op on native. */
export function registerServiceWorker() {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.warn('Service worker registration failed', err));
  };

  // React mounts from a deferred script, so `load` has often already fired by
  // the time this effect runs — waiting for it unconditionally means the worker
  // is never registered at all.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
