import { type JSX, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'

import { ViewMarginPreferenceMapper } from '#src/business/enum/view-margin-preference-mapper-enum'
import { ViewMarginPreferenceService } from '#src/business/service/view-margin-preference-service'
import { viewMarginPreferenceStorage } from '#src/lib/async-storage'

interface ViewMarginContextValue {
  margin: ViewMarginPreferenceMapper
  saveMargin: (margin: ViewMarginPreferenceMapper) => Promise<void>
}

const ViewMarginContext = createContext<ViewMarginContextValue | undefined>(undefined)

export const ViewMarginProvider = (props: { children: ReactNode }): JSX.Element => {
  const [margin, setMargin] = useState<ViewMarginPreferenceMapper>(ViewMarginPreferenceMapper.NORMAL)
  const viewMarginPreferenceService = useMemo(() => {
    return new ViewMarginPreferenceService()
  }, [])

  useEffect(() => {
    void viewMarginPreferenceService.loadPreference({ storage: viewMarginPreferenceStorage }).then((loadedMargin) => {
      setMargin(loadedMargin)
    })
  }, [viewMarginPreferenceService])

  const contextValue = useMemo(() => {
    return {
      margin,
      saveMargin: (nextMargin: ViewMarginPreferenceMapper) => {
        return viewMarginPreferenceService
          .savePreference({ margin: nextMargin, storage: viewMarginPreferenceStorage })
          .then(() => {
            setMargin(nextMargin)
          })
      },
    }
  }, [margin, viewMarginPreferenceService])

  return <ViewMarginContext.Provider value={contextValue}>{props.children}</ViewMarginContext.Provider>
}

export const useViewMargin = (): ViewMarginContextValue => {
  const contextValue = useContext(ViewMarginContext)

  if (!contextValue) {
    throw new Error('useViewMargin requires ViewMarginProvider')
  }

  return contextValue
}
