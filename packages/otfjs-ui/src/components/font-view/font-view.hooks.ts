import { createContext, useContext } from 'react'

const EMPTY_REF = { current: null } as const

export const TableViewContext =
  createContext<React.RefObject<HTMLDivElement | null>>(EMPTY_REF)

export function useTableView() {
  return useContext(TableViewContext)
}
