import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Providers } from './providers/index.js'
import { initTheme } from '../shared/lib/theme.js'
import './styles/index.css'

initTheme()

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <Providers />
  </StrictMode>,
)
