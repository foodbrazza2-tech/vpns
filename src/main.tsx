import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Initialise la PWA et les logs
const initApp = async () => {
  // Enregistre le manifest pour PWA
  const link = document.querySelector('link[rel="manifest"]') || document.createElement('link');
  link.rel = 'manifest';
  link.href = '/manifest.json';
  if (!document.querySelector('link[rel="manifest"]')) {
    document.head.appendChild(link);
  }

  // Ajoute les viewport meta tags pour mobile
  const viewport = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
  viewport.name = 'viewport';
  viewport.content = 'width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover';
  if (!document.querySelector('meta[name="viewport"]')) {
    document.head.appendChild(viewport);
  }

  // Ajoute les headers de sécurité
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;";
  document.head.appendChild(meta);
};

initApp();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
