import { type JSX, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'

import { IgnoredFilesPreferenceService } from '#src/business/service/ignored-files-preference-service'
import { ignoredFilesPreferenceStorage } from '#src/lib/async-storage'

interface IgnoredFilesContextValue {
  isIgnoredFilesHidden: boolean
  saveIsIgnoredFilesHidden: (isHidden: boolean) => Promise<void>
}

const IgnoredFilesContext = createContext<IgnoredFilesContextValue | undefined>(undefined)

export const IgnoredFilesProvider = (props: { children: ReactNode }): JSX.Element => {
  const [isIgnoredFilesHidden, setIsIgnoredFilesHidden] = useState(false)
  const ignoredFilesPreferenceService = useMemo(() => {
    return new IgnoredFilesPreferenceService()
  }, [])

  useEffect(() => {
    void ignoredFilesPreferenceService
      .loadPreference({ storage: ignoredFilesPreferenceStorage })
      .then((loadedIsHidden) => {
        setIsIgnoredFilesHidden(loadedIsHidden)
      })
  }, [ignoredFilesPreferenceService])

  const contextValue = useMemo(() => {
    return {
      isIgnoredFilesHidden,
      saveIsIgnoredFilesHidden: (nextIsHidden: boolean) => {
        return ignoredFilesPreferenceService
          .savePreference({ isIgnoredFilesHidden: nextIsHidden, storage: ignoredFilesPreferenceStorage })
          .then(() => {
            setIsIgnoredFilesHidden(nextIsHidden)
          })
      },
    }
  }, [ignoredFilesPreferenceService, isIgnoredFilesHidden])

  return <IgnoredFilesContext.Provider value={contextValue}>{props.children}</IgnoredFilesContext.Provider>
}

export const useIgnoredFiles = (): IgnoredFilesContextValue => {
  const contextValue = useContext(IgnoredFilesContext)

  if (!contextValue) {
    throw new Error('useIgnoredFiles requires IgnoredFilesProvider')
  }

  return contextValue
}
