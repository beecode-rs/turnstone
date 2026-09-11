import { type JSX, type ReactNode, createContext, useContext, useMemo, useState } from 'react'

interface FullscreenContextValue {
  isFullscreen: boolean
  setIsFullscreen: (isFullscreen: boolean) => void
}

const FullscreenContext = createContext<FullscreenContextValue | undefined>(undefined)

export const FullscreenProvider = (props: { children: ReactNode }): JSX.Element => {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const contextValue = useMemo(() => {
    return { isFullscreen, setIsFullscreen }
  }, [isFullscreen])

  return <FullscreenContext.Provider value={contextValue}>{props.children}</FullscreenContext.Provider>
}

export const useFullscreen = (): FullscreenContextValue => {
  const contextValue = useContext(FullscreenContext)

  if (!contextValue) {
    throw new Error('useFullscreen requires FullscreenProvider')
  }

  return contextValue
}
