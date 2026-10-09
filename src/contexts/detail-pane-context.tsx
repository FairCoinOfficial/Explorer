import { createContext, useContext } from 'react'

export const DetailPaneContext = createContext<{
  close: () => void
  mobile: boolean
} | null>(null)
export const useDetailPane = () => useContext(DetailPaneContext)

export const DetailSelectionContext = createContext('')
export const useDetailSelection = () => useContext(DetailSelectionContext)
