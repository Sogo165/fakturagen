import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const serviceWorkerUrl = new URL(`${import.meta.env.BASE_URL}sw.js`, window.location.href).href;
    navigator.serviceWorker.register(serviceWorkerUrl).catch(() => {
      // Aplikace funguje i bez instalace service workeru.
    });
  });
}
