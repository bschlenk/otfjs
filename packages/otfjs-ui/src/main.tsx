import React from 'react'
import ReactDOM from 'react-dom/client'

import { App } from './app'
import { registerShortcuts } from './shortcuts/shortcuts'

import './styles/colors.css'
import './main.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

registerShortcuts()
