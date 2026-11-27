import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/special-elite/400.css'
import './styles.css'
import App from './App.jsx'
import { startUpdater } from './updater.js'

createRoot(document.getElementById('root')).render(<App />)

startUpdater()
