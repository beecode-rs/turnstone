import { type JSX, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'

import { SearchIgnoredFilesPreferenceService } from '#src/business/service/search-ignored-files-preference-service'
import { searchIgnoredFilesPreferenceStorage } from '#src/lib/async-storage'

interface SearchIgnoredFilesContextValue {
  isSearchIgnoredFilesIncluded: boolean
  saveIsSearchIgnoredFilesIncluded: (isIncluded: boolean) => Promise<void>
}

const SearchIgnoredFilesContext = createContext<SearchIgnoredFilesContextValue | undefined>(undefined)

export const SearchIgnoredFilesProvider = (props: { children: ReactNode }): JSX.Element => {
  const [isSearchIgnoredFilesIncluded, setIsSearchIgnoredFilesIncluded] = useState(false)
  const searchIgnoredFilesPreferenceService = useMemo(() => {
    return new SearchIgnoredFilesPreferenceService()
  }, [])

  useEffect(() => {
    void searchIgnoredFilesPreferenceService
      .loadPreference({ storage: searchIgnoredFilesPreferenceStorage })
      .then((loadedIsIncluded) => {
        setIsSearchIgnoredFilesIncluded(loadedIsIncluded)
      })
  }, [searchIgnoredFilesPreferenceService])

  const contextValue = useMemo(() => {
    return {
      isSearchIgnoredFilesIncluded,
      saveIsSearchIgnoredFilesIncluded: (nextIsIncluded: boolean) => {
        return searchIgnoredFilesPreferenceService
          .savePreference({
            isSearchIgnoredFilesIncluded: nextIsIncluded,
            storage: searchIgnoredFilesPreferenceStorage,
          })
          .then(() => {
            setIsSearchIgnoredFilesIncluded(nextIsIncluded)
          })
      },
    }
  }, [isSearchIgnoredFilesIncluded, searchIgnoredFilesPreferenceService])

  return <SearchIgnoredFilesContext.Provider value={contextValue}>{props.children}</SearchIgnoredFilesContext.Provider>
}

export const useSearchIgnoredFiles = (): SearchIgnoredFilesContextValue => {
  const contextValue = useContext(SearchIgnoredFilesContext)

  if (!contextValue) {
    throw new Error('useSearchIgnoredFiles requires SearchIgnoredFilesProvider')
  }

  return contextValue
}
