import { type JSX, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'

import { type FabOpacityPreference } from '#src/business/model/fab-opacity-preference'
import { FabOpacityPreferenceService } from '#src/business/service/fab-opacity-preference-service'
import { fabOpacityPreferenceStorage } from '#src/lib/async-storage'
import { constant } from '#src/util/constant'

interface FabOpacityContextValue {
  opacityPercent: FabOpacityPreference
  saveOpacityPercent: (opacityPercent: FabOpacityPreference) => Promise<void>
}

const FabOpacityContext = createContext<FabOpacityContextValue | undefined>(undefined)

export const FabOpacityProvider = (props: { children: ReactNode }): JSX.Element => {
  const [opacityPercent, setOpacityPercent] = useState<FabOpacityPreference>(constant.fabOpacity.percent.default)
  const fabOpacityPreferenceService = useMemo(() => {
    return new FabOpacityPreferenceService()
  }, [])

  useEffect(() => {
    void fabOpacityPreferenceService
      .loadPreference({ storage: fabOpacityPreferenceStorage })
      .then((loadedOpacityPercent) => {
        setOpacityPercent(loadedOpacityPercent)
      })
  }, [fabOpacityPreferenceService])

  const contextValue = useMemo(() => {
    return {
      opacityPercent,
      saveOpacityPercent: (nextOpacityPercent: FabOpacityPreference) => {
        return fabOpacityPreferenceService
          .savePreference({ opacityPercent: nextOpacityPercent, storage: fabOpacityPreferenceStorage })
          .then(() => {
            setOpacityPercent(nextOpacityPercent)
          })
      },
    }
  }, [fabOpacityPreferenceService, opacityPercent])

  return <FabOpacityContext.Provider value={contextValue}>{props.children}</FabOpacityContext.Provider>
}

export const useFabOpacity = (): FabOpacityContextValue => {
  const contextValue = useContext(FabOpacityContext)

  if (!contextValue) {
    throw new Error('useFabOpacity requires FabOpacityProvider')
  }

  return contextValue
}
