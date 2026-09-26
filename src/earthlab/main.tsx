import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import EarthLabApp from './EarthLabApp'
import '@/styles/tailwind.css'
import '@/styles/global.css'
import './earthlab.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EarthLabApp />
  </StrictMode>,
)
