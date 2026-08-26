import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import { SettingsProvider } from './context/SettingsContext';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>
);
