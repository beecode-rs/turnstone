import { type JSX, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'

import { WordWrapPreferenceService } from '#src/business/service/word-wrap-preference-service'
import { wordWrapPreferenceStorage } from '#src/lib/async-storage'

interface WordWrapContextValue {
  isWordWrapEnabled: boolean
  saveIsWordWrapEnabled: (isEnabled: boolean) => Promise<void>
}

const WordWrapContext = createContext<WordWrapContextValue | undefined>(undefined)

export const WordWrapProvider = (props: { children: ReactNode }): JSX.Element => {
  const [isWordWrapEnabled, setIsWordWrapEnabled] = useState(false)
  const wordWrapPreferenceService = useMemo(() => {
    return new WordWrapPreferenceService()
  }, [])

  useEffect(() => {
    void wordWrapPreferenceService.loadPreference({ storage: wordWrapPreferenceStorage }).then((loadedIsEnabled) => {
      setIsWordWrapEnabled(loadedIsEnabled)
    })
  }, [wordWrapPreferenceService])

  const contextValue = useMemo(() => {
    return {
      isWordWrapEnabled,
      saveIsWordWrapEnabled: (nextIsEnabled: boolean) => {
        return wordWrapPreferenceService
          .savePreference({ isWordWrapEnabled: nextIsEnabled, storage: wordWrapPreferenceStorage })
          .then(() => {
            setIsWordWrapEnabled(nextIsEnabled)
          })
      },
    }
  }, [isWordWrapEnabled, wordWrapPreferenceService])

  return <WordWrapContext.Provider value={contextValue}>{props.children}</WordWrapContext.Provider>
}

export const useWordWrap = (): WordWrapContextValue => {
  const contextValue = useContext(WordWrapContext)

  if (!contextValue) {
    throw new Error('useWordWrap requires WordWrapProvider')
  }

  return contextValue
}
