import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import msalInstance from './msal'

async function initAndRender() {
  try {
    if (typeof (msalInstance as any).initialize === 'function') {
      await (msalInstance as any).initialize();
    }
  } catch (e) {
    console.warn('MSAL initialize failed or not required', e);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

initAndRender();
