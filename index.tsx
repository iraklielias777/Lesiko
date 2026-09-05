
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
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
    <App />
  </React.StrictMode>
);
