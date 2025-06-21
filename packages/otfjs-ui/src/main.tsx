import './polyfill'

import React from 'react'
import ReactDOM from 'react-dom/client'

import { App } from './app'
import { FontProvider } from './components/font-context'
import { registerShortcuts } from './shortcuts/shortcuts'

import './styles/colors.css'
import './main.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <FontProvider>
      <App />
    </FontProvider>
  </React.StrictMode>,
)

registerShortcuts()
