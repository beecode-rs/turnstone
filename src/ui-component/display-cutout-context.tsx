import { type JSX, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'

import { DisplayCutoutPreferenceService } from '#src/business/service/display-cutout-preference-service'
import { displayCutoutPreferenceStorage } from '#src/lib/async-storage'

interface DisplayCutoutContextValue {
  isContentBehindCutout: boolean
  saveIsContentBehindCutout: (nextIsContentBehindCutout: boolean) => Promise<void>
}

const DisplayCutoutContext = createContext<DisplayCutoutContextValue | undefined>(undefined)

export const DisplayCutoutProvider = (props: { children: ReactNode }): JSX.Element => {
  const [isContentBehindCutout, setIsContentBehindCutout] = useState(false)
  const displayCutoutPreferenceService = useMemo(() => {
    return new DisplayCutoutPreferenceService()
  }, [])

  useEffect(() => {
    void displayCutoutPreferenceService
      .loadPreference({ storage: displayCutoutPreferenceStorage })
      .then((loadedIsContentBehindCutout) => {
        setIsContentBehindCutout(loadedIsContentBehindCutout)
      })
  }, [displayCutoutPreferenceService])

  const contextValue = useMemo(() => {
    return {
      isContentBehindCutout,
      saveIsContentBehindCutout: (nextIsContentBehindCutout: boolean) => {
        return displayCutoutPreferenceService
          .savePreference({
            isContentBehindCutout: nextIsContentBehindCutout,
            storage: displayCutoutPreferenceStorage,
          })
          .then(() => {
            setIsContentBehindCutout(nextIsContentBehindCutout)
          })
      },
    }
  }, [displayCutoutPreferenceService, isContentBehindCutout])

  return <DisplayCutoutContext.Provider value={contextValue}>{props.children}</DisplayCutoutContext.Provider>
}

export const useDisplayCutout = (): DisplayCutoutContextValue => {
  const contextValue = useContext(DisplayCutoutContext)

  if (!contextValue) {
    throw new Error('useDisplayCutout requires DisplayCutoutProvider')
  }

  return contextValue
}
