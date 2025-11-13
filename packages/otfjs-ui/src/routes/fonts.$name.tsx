import { createFileRoute } from '@tanstack/react-router'
import { fetchFontByName } from '../utils/fetch-font'
import { FontView } from '../components/font-view/font-view'
import type { Font } from 'otfjs'

export const Route = createFileRoute('/fonts/$name')({
  component: RouteComponent,
  loader: ({ params: { name } }) => fetchFontByName(name),
})

function RouteComponent() {
  const font = Route.useLoaderData()
  return <FontView font={font as Font} />
}
