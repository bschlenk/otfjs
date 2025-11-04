import './polyfill'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { registerShortcuts } from './shortcuts/shortcuts'

import './styles/colors.css'
import './main.css'

import { routeTree } from './route-tree.gen'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { type Font } from 'otfjs'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }

  interface HistoryState {
    font: Font | null
  }
}

declare global {
  const root: HTMLElement
}

const reactRoot = createRoot(root)
reactRoot.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

registerShortcuts()
