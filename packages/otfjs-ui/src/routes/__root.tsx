import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { FullScreenDropZone } from '../components/full-screen-drop-zone/full-screen-drop-zone'

export const Route = createRootRoute({
  component: () => (
    <>
      <FullScreenDropZone>
        <Outlet />
      </FullScreenDropZone>
      <TanStackRouterDevtools />
    </>
  ),
})
