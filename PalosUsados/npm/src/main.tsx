import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './azalea-palos-usados.jsx'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
