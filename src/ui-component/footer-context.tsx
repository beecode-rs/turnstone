import { type JSX, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'

import { FooterPreferenceService } from '#src/business/service/footer-preference-service'
import { footerPreferenceStorage } from '#src/lib/async-storage'

interface FooterContextValue {
  isFooterHidden: boolean
  saveIsFooterHidden: (isHidden: boolean) => Promise<void>
}

const FooterContext = createContext<FooterContextValue | undefined>(undefined)

export const FooterProvider = (props: { children: ReactNode }): JSX.Element => {
  const [isFooterHidden, setIsFooterHidden] = useState(false)
  const footerPreferenceService = useMemo(() => {
    return new FooterPreferenceService()
  }, [])

  useEffect(() => {
    void footerPreferenceService.loadPreference({ storage: footerPreferenceStorage }).then((loadedIsHidden) => {
      setIsFooterHidden(loadedIsHidden)
    })
  }, [footerPreferenceService])

  const contextValue = useMemo(() => {
    return {
      isFooterHidden,
      saveIsFooterHidden: (nextIsHidden: boolean) => {
        return footerPreferenceService
          .savePreference({ isFooterHidden: nextIsHidden, storage: footerPreferenceStorage })
          .then(() => {
            setIsFooterHidden(nextIsHidden)
          })
      },
    }
  }, [isFooterHidden, footerPreferenceService])

  return <FooterContext.Provider value={contextValue}>{props.children}</FooterContext.Provider>
}

export const useFooter = (): FooterContextValue => {
  const contextValue = useContext(FooterContext)

  if (!contextValue) {
    throw new Error('useFooter requires FooterProvider')
  }

  return contextValue
}
