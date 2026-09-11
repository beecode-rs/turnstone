import { type JSX, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'

import { DotFilesPreferenceService } from '#src/business/service/dot-files-preference-service'
import { dotFilesPreferenceStorage } from '#src/lib/async-storage'

interface DotFilesContextValue {
  isDotFilesHidden: boolean
  saveIsDotFilesHidden: (isHidden: boolean) => Promise<void>
}

const DotFilesContext = createContext<DotFilesContextValue | undefined>(undefined)

export const DotFilesProvider = (props: { children: ReactNode }): JSX.Element => {
  const [isDotFilesHidden, setIsDotFilesHidden] = useState(false)
  const dotFilesPreferenceService = useMemo(() => {
    return new DotFilesPreferenceService()
  }, [])

  useEffect(() => {
    void dotFilesPreferenceService.loadPreference({ storage: dotFilesPreferenceStorage }).then((loadedIsHidden) => {
      setIsDotFilesHidden(loadedIsHidden)
    })
  }, [dotFilesPreferenceService])

  const contextValue = useMemo(() => {
    return {
      isDotFilesHidden,
      saveIsDotFilesHidden: (nextIsHidden: boolean) => {
        return dotFilesPreferenceService
          .savePreference({ isDotFilesHidden: nextIsHidden, storage: dotFilesPreferenceStorage })
          .then(() => {
            setIsDotFilesHidden(nextIsHidden)
          })
      },
    }
  }, [dotFilesPreferenceService, isDotFilesHidden])

  return <DotFilesContext.Provider value={contextValue}>{props.children}</DotFilesContext.Provider>
}

export const useDotFiles = (): DotFilesContextValue => {
  const contextValue = useContext(DotFilesContext)

  if (!contextValue) {
    throw new Error('useDotFiles requires DotFilesProvider')
  }

  return contextValue
}
