import {
  type JSX,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { openScreensUseCase } from '#src/business/use-case/open-screens-use-case'
import { OPEN_SCREENS_INITIAL_STATE, type OpenScreensState, openScreensUtil } from '#src/util/open-screens-util'

interface OpenScreensContextValue {
  activeFilePath: string | null
  activateFile: (params: { path: string | null }) => void
  closeDrawer: () => void
  closeFile: (params: { path: string }) => void
  isDrawerOpen: boolean
  openDrawer: () => void
  openFile: (params: { path: string }) => void
  openFilePaths: string[]
  reset: () => void
  setHost: (params: { hostId: string }) => void
}

const OpenScreensContext = createContext<OpenScreensContextValue | undefined>(undefined)

export const OpenScreensProvider = (props: { children: ReactNode }): JSX.Element => {
  const [state, setState] = useState<OpenScreensState>(OPEN_SCREENS_INITIAL_STATE)
  const hostIdRef = useRef<string | null>(null)

  const activateFile = useCallback((params: { path: string | null }) => {
    setState((previous) => {
      return openScreensUtil.activateFile({ ...params, state: previous })
    })
  }, [])

  const closeDrawer = useCallback(() => {
    setState((previous) => {
      return openScreensUtil.closeDrawer({ state: previous })
    })
  }, [])

  const closeFile = useCallback((params: { path: string }) => {
    setState((previous) => {
      return openScreensUtil.closeFile({ ...params, state: previous })
    })
  }, [])

  const openDrawer = useCallback(() => {
    setState((previous) => {
      return openScreensUtil.openDrawer({ state: previous })
    })
  }, [])

  const openFile = useCallback((params: { path: string }) => {
    setState((previous) => {
      return openScreensUtil.openFile({ ...params, state: previous })
    })
  }, [])

  const reset = useCallback(() => {
    setState(OPEN_SCREENS_INITIAL_STATE)
  }, [])

  const setHost = useCallback((params: { hostId: string }) => {
    hostIdRef.current = params.hostId
    const record = openScreensUseCase.loadOpenScreens({ hostId: params.hostId })
    if (!record) {
      setState(OPEN_SCREENS_INITIAL_STATE)

      return
    }
    setState(openScreensUtil.restoreFiles({ record }))
  }, [])

  useEffect(() => {
    const hostId = hostIdRef.current
    if (!hostId) {
      return
    }
    if (state === OPEN_SCREENS_INITIAL_STATE) {
      return
    }
    openScreensUseCase.persistOpenScreens({ hostId, record: openScreensUtil.toRecord({ state }) })
  }, [state])

  const contextValue = useMemo(() => {
    return {
      activateFile,
      activeFilePath: state.activeFilePath,
      closeDrawer,
      closeFile,
      isDrawerOpen: state.isDrawerOpen,
      openDrawer,
      openFile,
      openFilePaths: state.openFilePaths,
      reset,
      setHost,
    }
  }, [state, activateFile, closeDrawer, closeFile, openDrawer, openFile, reset, setHost])

  return <OpenScreensContext.Provider value={contextValue}>{props.children}</OpenScreensContext.Provider>
}

export const useOpenScreens = (): OpenScreensContextValue => {
  const contextValue = useContext(OpenScreensContext)

  if (!contextValue) {
    throw new Error('useOpenScreens requires OpenScreensProvider')
  }

  return contextValue
}
