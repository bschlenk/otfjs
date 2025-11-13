import './polyfill'

import { StrictMode } from 'react'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { createRoot } from 'react-dom/client'

import { routeTree } from './route-tree.gen'
import { registerShortcuts } from './shortcuts/shortcuts'

import './styles/colors.css'
import './main.css'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }

  interface HistoryState {
    fontId: number | null
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
