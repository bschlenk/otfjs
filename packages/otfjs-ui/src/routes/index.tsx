import { createFileRoute, useRouterState } from '@tanstack/react-router'

import { FontList } from '../components/font-list/font-list'
import { FontView } from '../components/font-view/font-view'
import { getFontById } from '../utils/fetch-font'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const routerState = useRouterState()
  const fontId = routerState.location.state.fontId

  if (fontId) {
    const font = getFontById(fontId)
    if (font) return <FontView font={font} />
  }

  return <FontList />
}
