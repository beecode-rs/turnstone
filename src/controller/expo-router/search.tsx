import { router, useLocalSearchParams } from 'expo-router'
import { type JSX, useEffect, useRef, useState } from 'react'
import { Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { SearchModeMapper } from '#src/business/enum/search-mode-mapper-enum'
import { type SearchMatch } from '#src/business/model/search-match'
import { CapabilityProbeService } from '#src/business/service/capability-probe-service'
import { RemoteExecService } from '#src/business/service/remote-exec-service'
import { type SearchHandle, SearchService } from '#src/business/service/search-service'
import { serverConnectUseCase } from '#src/business/use-case/server-connect-use-case'
import { type AppTopBarAction, type AppTopBarSelect } from '#src/ui-component/app-top-bar'
import { CollapsibleTopBar } from '#src/ui-component/collapsible-top-bar'
import { useOpenScreens } from '#src/ui-component/open-screens/open-screens-context'
import { SearchBar } from '#src/ui-component/search/search-bar'
import { useSearchIgnoredFiles } from '#src/ui-component/search/search-ignored-files-context'
import { SearchResultList } from '#src/ui-component/search/search-result-list'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { type TopBarSelectOption } from '#src/ui-component/top-bar-select'

const remoteExec = new RemoteExecService()

const searchService = new SearchService({
  capabilityProbe: new CapabilityProbeService({ remoteExec }),
  remoteExec,
})

const toSearchModeLabel = (mode: SearchModeMapper): string => {
  switch (mode) {
    case SearchModeMapper.CONTENT: {
      return 'Content'
    }
    case SearchModeMapper.FILENAME: {
      return 'Filename'
    }
    default: {
      throw new Error('Unsupported search mode')
    }
  }
}

const SEARCH_MODE_OPTIONS: TopBarSelectOption[] = [SearchModeMapper.CONTENT, SearchModeMapper.FILENAME].map((mode) => {
  return { label: toSearchModeLabel(mode), value: mode }
})

const resolveHeaderActions = (params: {
  hasSubmitted: boolean
  onPressRefresh: () => void
  query: string
}): AppTopBarAction[] => {
  const { hasSubmitted, onPressRefresh, query } = params
  if (!hasSubmitted || query.trim() === '') {
    return []
  }

  return [{ icon: 'refresh', key: 'refresh', onPress: onPressRefresh, tip: 'Run search again' }]
}

export const SearchController = (): JSX.Element => {
  const { host, root } = useLocalSearchParams<{ host: string; root?: string }>()
  const { navigationTheme } = useThemePreference()
  const { openDrawer, openFile } = useOpenScreens()
  const { isSearchIgnoredFilesIncluded } = useSearchIgnoredFiles()
  const searchRoot = root ?? '/'
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isCancelled, setIsCancelled] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [matches, setMatches] = useState<SearchMatch[]>([])
  const [mode, setMode] = useState<SearchModeMapper>(SearchModeMapper.CONTENT)
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const isCancelRequestedRef = useRef(false)
  const searchHandleRef = useRef<SearchHandle | null>(null)
  const searchSequenceRef = useRef(0)

  useEffect(() => {
    return () => {
      isCancelRequestedRef.current = true
      searchHandleRef.current?.cancel()
    }
  }, [])

  const appendMatches = (params: { batch: SearchMatch[]; searchId: number }): void => {
    const { batch, searchId } = params
    if (searchId !== searchSequenceRef.current) {
      return
    }
    setMatches((previous) => {
      return [...previous, ...batch]
    })
  }

  const handlePressAbout = (): void => {
    router.navigate({ pathname: '/about' })
  }

  const handlePressSettings = (): void => {
    router.navigate({ pathname: '/settings' })
  }

  const handleSubmit = (): void => {
    const trimmedQuery = query.trim()
    if (trimmedQuery === '') {
      return
    }
    const searchId = searchSequenceRef.current + 1
    searchSequenceRef.current = searchId
    searchHandleRef.current?.cancel()
    setHasSubmitted(true)
    setSubmittedQuery(trimmedQuery)
    setIsCancelled(false)
    setIsSearching(true)
    setMatches([])
    isCancelRequestedRef.current = false
    searchHandleRef.current = null
    void serverConnectUseCase
      .getTransport({ hostId: host })
      .then((transport) => {
        const handle = searchService.search({
          hostId: host,
          isIgnoredFilesIncluded: isSearchIgnoredFilesIncluded,
          mode,
          onBatch: (batch) => {
            appendMatches({ batch, searchId })
          },
          pattern: trimmedQuery,
          root: searchRoot,
          transport,
        })
        searchHandleRef.current = handle

        return handle.result
      })
      .then((result) => {
        if (searchId !== searchSequenceRef.current) {
          return
        }
        setIsCancelled(result.isCancelled)
      })
      .catch((error: unknown) => {
        const isStaleSearch = searchId !== searchSequenceRef.current
        if (isStaleSearch || isCancelRequestedRef.current) {
          return
        }
        Alert.alert('Search failed', String(error))
      })
      .finally(() => {
        if (searchId !== searchSequenceRef.current) {
          return
        }
        setIsSearching(false)
      })
  }

  const handleCancel = (): void => {
    isCancelRequestedRef.current = true
    setIsCancelled(true)
    searchHandleRef.current?.cancel()
  }

  const handlePressMatch = (match: SearchMatch): void => {
    openFile({ path: match.path })
    router.back()
  }

  const selects: AppTopBarSelect[] = [
    {
      key: 'search-mode',
      onChange: (value) => {
        setMode(value as SearchModeMapper)
      },
      options: SEARCH_MODE_OPTIONS,
      value: mode,
    },
  ]

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.safeArea, { backgroundColor: navigationTheme.colors.background }]}
    >
      <CollapsibleTopBar
        actions={resolveHeaderActions({
          hasSubmitted,
          onPressRefresh: handleSubmit,
          query,
        })}
        onPressMenu={openDrawer}
        onPressAbout={handlePressAbout}
        onPressSettings={handlePressSettings}
        selects={selects}
        title="Search"
      />
      <SearchBar
        isSearching={isSearching}
        onCancel={handleCancel}
        onChangeQuery={setQuery}
        onSubmit={handleSubmit}
        query={query}
      />
      <SearchResultList
        hasSubmitted={hasSubmitted}
        isCancelled={isCancelled}
        isSearching={isSearching}
        matches={matches}
        onPressMatch={handlePressMatch}
        query={submittedQuery}
        root={searchRoot}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
})
