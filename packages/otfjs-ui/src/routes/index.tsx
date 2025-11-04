import { createFileRoute, useRouterState } from '@tanstack/react-router'
import { NoFontView } from '../components/no-font-view/no-font-view'
import { FontView } from '../components/font-view/font-view'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const routerState = useRouterState()
  const font = routerState.location.state.font

  return font ? <FontView font={font} /> : <NoFontView />
}
