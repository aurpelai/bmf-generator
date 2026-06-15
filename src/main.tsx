import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import { TooltipProvider } from '@/components/ui/tooltip';

import App from './App.tsx';

document.documentElement.classList.add('dark');

const spaRedirect = sessionStorage.getItem('spa-redirect');

if (spaRedirect) {
  sessionStorage.removeItem('spa-redirect');

  if (spaRedirect.startsWith(import.meta.env.BASE_URL)) {
    history.replaceState(null, '', spaRedirect);
  }
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById('root')!).render(
  // root element always exists in index.html
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </BrowserRouter>
  </StrictMode>,
);
