import { type JSX, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'

import { LineNumbersPreferenceService } from '#src/business/service/line-numbers-preference-service'
import { lineNumbersPreferenceStorage } from '#src/lib/async-storage'

interface LineNumbersContextValue {
  isLineNumbersHidden: boolean
  saveIsLineNumbersHidden: (isHidden: boolean) => Promise<void>
}

const LineNumbersContext = createContext<LineNumbersContextValue | undefined>(undefined)

export const LineNumbersProvider = (props: { children: ReactNode }): JSX.Element => {
  const [isLineNumbersHidden, setIsLineNumbersHidden] = useState(false)
  const lineNumbersPreferenceService = useMemo(() => {
    return new LineNumbersPreferenceService()
  }, [])

  useEffect(() => {
    void lineNumbersPreferenceService
      .loadPreference({ storage: lineNumbersPreferenceStorage })
      .then((loadedIsHidden) => {
        setIsLineNumbersHidden(loadedIsHidden)
      })
  }, [lineNumbersPreferenceService])

  const contextValue = useMemo(() => {
    return {
      isLineNumbersHidden,
      saveIsLineNumbersHidden: (nextIsHidden: boolean) => {
        return lineNumbersPreferenceService
          .savePreference({ isLineNumbersHidden: nextIsHidden, storage: lineNumbersPreferenceStorage })
          .then(() => {
            setIsLineNumbersHidden(nextIsHidden)
          })
      },
    }
  }, [isLineNumbersHidden, lineNumbersPreferenceService])

  return <LineNumbersContext.Provider value={contextValue}>{props.children}</LineNumbersContext.Provider>
}

export const useLineNumbers = (): LineNumbersContextValue => {
  const contextValue = useContext(LineNumbersContext)

  if (!contextValue) {
    throw new Error('useLineNumbers requires LineNumbersProvider')
  }

  return contextValue
}
