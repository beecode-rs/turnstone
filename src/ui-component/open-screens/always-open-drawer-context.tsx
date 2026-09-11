import { type JSX, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'

import { AlwaysOpenDrawerPreferenceService } from '#src/business/service/always-open-drawer-preference-service'
import { alwaysOpenDrawerPreferenceStorage } from '#src/lib/async-storage'

interface AlwaysOpenDrawerContextValue {
  isAlwaysOpenDrawer: boolean
  saveIsAlwaysOpenDrawer: (isOpen: boolean) => Promise<void>
}

const AlwaysOpenDrawerContext = createContext<AlwaysOpenDrawerContextValue | undefined>(undefined)

export const AlwaysOpenDrawerProvider = (props: { children: ReactNode }): JSX.Element => {
  const [isAlwaysOpenDrawer, setIsAlwaysOpenDrawer] = useState(false)
  const alwaysOpenDrawerPreferenceService = useMemo(() => {
    return new AlwaysOpenDrawerPreferenceService()
  }, [])

  useEffect(() => {
    void alwaysOpenDrawerPreferenceService
      .loadPreference({ storage: alwaysOpenDrawerPreferenceStorage })
      .then((loadedIsAlwaysOpen) => {
        setIsAlwaysOpenDrawer(loadedIsAlwaysOpen)
      })
  }, [alwaysOpenDrawerPreferenceService])

  const contextValue = useMemo(() => {
    return {
      isAlwaysOpenDrawer,
      saveIsAlwaysOpenDrawer: (nextIsAlwaysOpen: boolean) => {
        return alwaysOpenDrawerPreferenceService
          .savePreference({ isAlwaysOpenDrawer: nextIsAlwaysOpen, storage: alwaysOpenDrawerPreferenceStorage })
          .then(() => {
            setIsAlwaysOpenDrawer(nextIsAlwaysOpen)
          })
      },
    }
  }, [alwaysOpenDrawerPreferenceService, isAlwaysOpenDrawer])

  return <AlwaysOpenDrawerContext.Provider value={contextValue}>{props.children}</AlwaysOpenDrawerContext.Provider>
}

export const useAlwaysOpenDrawer = (): AlwaysOpenDrawerContextValue => {
  const contextValue = useContext(AlwaysOpenDrawerContext)

  if (!contextValue) {
    throw new Error('useAlwaysOpenDrawer requires AlwaysOpenDrawerProvider')
  }

  return contextValue
}
