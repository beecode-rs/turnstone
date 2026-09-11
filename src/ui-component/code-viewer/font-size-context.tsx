import { type JSX, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'

import { FontSizePreferenceMapper } from '#src/business/enum/font-size-preference-mapper-enum'
import { FontSizePreferenceService } from '#src/business/service/font-size-preference-service'
import { fontSizePreferenceStorage } from '#src/lib/async-storage'

interface FontSizeContextValue {
  fontSize: FontSizePreferenceMapper
  saveFontSize: (fontSize: FontSizePreferenceMapper) => Promise<void>
}

const FontSizeContext = createContext<FontSizeContextValue | undefined>(undefined)

export const FontSizeProvider = (props: { children: ReactNode }): JSX.Element => {
  const [fontSize, setFontSize] = useState<FontSizePreferenceMapper>(FontSizePreferenceMapper.M)
  const fontSizePreferenceService = useMemo(() => {
    return new FontSizePreferenceService()
  }, [])

  useEffect(() => {
    void fontSizePreferenceService.loadPreference({ storage: fontSizePreferenceStorage }).then((loadedFontSize) => {
      setFontSize(loadedFontSize)
    })
  }, [fontSizePreferenceService])

  const contextValue = useMemo(() => {
    return {
      fontSize,
      saveFontSize: (nextFontSize: FontSizePreferenceMapper) => {
        return fontSizePreferenceService
          .savePreference({ fontSize: nextFontSize, storage: fontSizePreferenceStorage })
          .then(() => {
            setFontSize(nextFontSize)
          })
      },
    }
  }, [fontSize, fontSizePreferenceService])

  return <FontSizeContext.Provider value={contextValue}>{props.children}</FontSizeContext.Provider>
}

export const useFontSize = (): FontSizeContextValue => {
  const contextValue = useContext(FontSizeContext)

  if (!contextValue) {
    throw new Error('useFontSize requires FontSizeProvider')
  }

  return contextValue
}
