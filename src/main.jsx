import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/special-elite/400.css'
import './styles.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
      console.warn('Enregistrement du service worker impossible :', error)
    })
  })
}
