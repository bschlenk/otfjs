import { createFileRoute } from '@tanstack/react-router'
import { NoFontView } from '../components/no-font-view/no-font-view'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return <NoFontView />
}
