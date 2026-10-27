import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './styles/global.css'
import './styles/screens.css'

const root = document.getElementById('root')
if (!root) {
  throw new Error('Tiny Worlds could not find the root element.')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
