
import React from 'react';
import ReactDOM from 'react-dom/client';
import { WhisperrProvider } from '@whisperr/react';
import App from './App';
import { WhisperrBridge } from './components/analytics/WhisperrBridge';
import './i18n'; // Initialize i18n
import './index.css';
import { installErrorReporting } from './lib/error-reporting';
import { primeHomepage } from './lib/hero';

installErrorReporting(import.meta.env.VITE_SUPABASE_URL || '');
// Start the site-content fetch and the hero image before React has mounted.
primeHomepage();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* Whisperr batches and flushes in the background; mounting it here never blocks startup. */}
    <WhisperrProvider
      options={{
        apiKey: import.meta.env.VITE_WHISPERR_INGESTION_API_KEY,
        baseUrl: 'https://api.whisperr.net',
      }}
    >
      <WhisperrBridge />
      <App />
    </WhisperrProvider>
  </React.StrictMode>
);
