import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with immediate check
registerSW({
  immediate: true,
  onNeedRefresh() {
    // Handled by UpdateToast component in UI
  },
  onOfflineReady() {
    console.log('SikaManger is ready for full offline operation.');
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
