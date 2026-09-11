import { router, useLocalSearchParams } from 'expo-router'
import { type JSX, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native'

import { GitDiffLayoutMapper } from '#src/business/enum/git-diff-layout-mapper-enum'
import { GitDiffModeMapper } from '#src/business/enum/git-diff-mode-mapper-enum'
import { GitDiffScopeMapper } from '#src/business/enum/git-diff-scope-mapper-enum'
import { GitStatusChangeTypeMapper } from '#src/business/enum/git-status-change-type-mapper-enum'
import { FileCapReachedError, type FileOpenResult } from '#src/business/model/file-content'
import { type GitDiffFilePatch } from '#src/business/model/git-diff'
import { type GitScreenRow } from '#src/business/model/git-screen'
import { type GitStatus } from '#src/business/model/git-status'
import { type SshTransport } from '#src/business/model/ssh-transport'
import { FileReadService } from '#src/business/service/file-read-service'
import { GitDetectService } from '#src/business/service/git-detect-service'
import { GitDiffService } from '#src/business/service/git-diff-service'
import { GitStatusService } from '#src/business/service/git-status-service'
import { RemoteExecService } from '#src/business/service/remote-exec-service'
import { gitScreenUseCase } from '#src/business/use-case/git-screen-use-case'
import { serverConnectUseCase } from '#src/business/use-case/server-connect-use-case'
import { AppBottomBar } from '#src/ui-component/app-bottom-bar'
import { type AppTopBarSelect } from '#src/ui-component/app-top-bar'
import { CollapsibleTopBar } from '#src/ui-component/collapsible-top-bar'
import { CutoutSafeArea } from '#src/ui-component/cutout-safe-area'
import { BranchHeader } from '#src/ui-component/git/branch-header'
import { ChangedFileList } from '#src/ui-component/git/changed-file-list'
import { useOpenScreens } from '#src/ui-component/open-screens/open-screens-context'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { type TopBarSelectOption } from '#src/ui-component/top-bar-select'
import { gitDiffParseUtil } from '#src/util/git-diff-parse-util'
import { remotePathUtil } from '#src/util/remote-path-util'

const toDiffModeLabel = (mode: GitDiffModeMapper): string => {
  switch (mode) {
    case GitDiffModeMapper.HEAD: {
      return 'HEAD'
    }
    case GitDiffModeMapper.CACHED: {
      return 'Cached'
    }
    case GitDiffModeMapper.WORKTREE: {
      return 'Worktree'
    }
    default: {
      throw new Error('Unsupported diff mode')
    }
  }
}

const DIFF_MODE_OPTIONS: TopBarSelectOption[] = [
  GitDiffModeMapper.WORKTREE,
  GitDiffModeMapper.CACHED,
  GitDiffModeMapper.HEAD,
].map((mode) => {
  return { label: toDiffModeLabel(mode), value: mode }
})

const toDiffLayoutLabel = (layout: GitDiffLayoutMapper): string => {
  switch (layout) {
    case GitDiffLayoutMapper.SPLIT: {
      return 'Split'
    }
    case GitDiffLayoutMapper.UNIFIED: {
      return 'Unified'
    }
    default: {
      throw new Error('Unsupported diff layout')
    }
  }
}

const DIFF_LAYOUT_OPTIONS: TopBarSelectOption[] = [GitDiffLayoutMapper.UNIFIED, GitDiffLayoutMapper.SPLIT].map(
  (layout) => {
    return { label: toDiffLayoutLabel(layout), value: layout }
  },
)

const toDiffScopeLabel = (scope: GitDiffScopeMapper): string => {
  switch (scope) {
    case GitDiffScopeMapper.CHANGES: {
      return 'Diff'
    }
    case GitDiffScopeMapper.FULL: {
      return 'File diff'
    }
    default: {
      throw new Error('Unsupported diff scope')
    }
  }
}

const DIFF_SCOPE_OPTIONS: TopBarSelectOption[] = [GitDiffScopeMapper.CHANGES, GitDiffScopeMapper.FULL].map((scope) => {
  return { label: toDiffScopeLabel(scope), value: scope }
})

const remoteExec = new RemoteExecService()

const fileReadService = new FileReadService()
const gitDetectService = new GitDetectService({ remoteExec })
const gitDiffService = new GitDiffService({ remoteExec })
const gitStatusService = new GitStatusService({ remoteExec })

interface UntrackedContent {
  isBinary: boolean
  isTruncated: boolean
  text: string
}

const accumulateUntrackedContent = (params: {
  openResult: FileOpenResult
  text: string
  transport: SshTransport
}): Promise<UntrackedContent> => {
  const { openResult, text, transport } = params
  const content = openResult.content
  if (content.isBinary) {
    return Promise.resolve({ isBinary: true, isTruncated: false, text: '' })
  }
  const nextText = `${text}${content.text}`
  if (openResult.state === null || content.isCapReached) {
    return Promise.resolve({ isBinary: false, isTruncated: content.hasMore, text: nextText })
  }

  return fileReadService
    .loadMore({ state: openResult.state, transport })
    .then((nextResult) => {
      return accumulateUntrackedContent({
        openResult: nextResult,
        text: nextText,
        transport,
      })
    })
    .catch((error: unknown) => {
      if (error instanceof FileCapReachedError) {
        return { isBinary: false, isTruncated: true, text: nextText }
      }

      throw error
    })
}

type GitRepoState = { status: 'loading' } | { status: 'not-repo' } | { repoRoot: string; status: 'ready' }

export const GitController = (): JSX.Element => {
  const { file, host, root } = useLocalSearchParams<{ file?: string; host: string; root?: string }>()
  const { navigationTheme } = useThemePreference()
  const { openDrawer } = useOpenScreens()
  const [repoState, setRepoState] = useState<GitRepoState>({ status: 'loading' })
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [diffLayout, setDiffLayout] = useState<GitDiffLayoutMapper>(() => {
    return gitScreenUseCase.loadDiffLayout()
  })
  const [diffMode, setDiffMode] = useState<GitDiffModeMapper>(GitDiffModeMapper.WORKTREE)
  const [diffScope, setDiffScope] = useState<GitDiffScopeMapper>(() => {
    return gitScreenUseCase.loadDiffScope()
  })
  const [expandedByKey, setExpandedByKey] = useState<Record<string, boolean>>({})
  const [patchByKey, setPatchByKey] = useState<Record<string, GitDiffFilePatch | null | undefined>>({})
  const [statusRefreshToken, setStatusRefreshToken] = useState(0)
  const autoOpenKeyRef = useRef<string | null>(null)
  const loadingRowKeysRef = useRef<Set<string>>(new Set())
  const patchLoadIdRef = useRef(0)

  useEffect(() => {
    setRepoState({ status: 'loading' })
    void serverConnectUseCase
      .getTransport({ hostId: host })
      .then((transport) => {
        return gitDetectService.detect({ hostId: host, path: root ?? '/', transport })
      })
      .then((detection) => {
        if (detection.status === 'repo') {
          setRepoState({ repoRoot: detection.toplevel, status: 'ready' })

          return
        }
        setRepoState({ status: 'not-repo' })
      })
      .catch((error: unknown) => {
        Alert.alert('Git detection failed', String(error))
      })
  }, [host])

  useEffect(() => {
    if (repoState.status !== 'ready') {
      return
    }
    setIsLoadingStatus(true)
    void serverConnectUseCase
      .getTransport({ hostId: host })
      .then((transport) => {
        return gitStatusService.getStatus({ repoRoot: repoState.repoRoot, transport })
      })
      .then((nextStatus) => {
        setStatus(nextStatus)
      })
      .catch((error: unknown) => {
        Alert.alert('Git status failed', String(error))
      })
      .finally(() => {
        setIsLoadingStatus(false)
      })
  }, [repoState, statusRefreshToken])

  const rows = useMemo(() => {
    return (status?.changes ?? []).map((change): GitScreenRow => {
      const rowKey = `${diffMode}::${diffScope}::${change.path}`
      const patch = patchByKey[rowKey] ?? null

      return {
        change,
        isExpanded: expandedByKey[rowKey] ?? false,
        isPatchLoaded: patchByKey[rowKey] !== undefined,
        patch,
        rowKey,
      }
    })
  }, [diffMode, diffScope, expandedByKey, patchByKey, status])

  const handlePressAbout = (): void => {
    router.navigate({ pathname: '/about' })
  }

  const handlePressSettings = (): void => {
    router.navigate({ pathname: '/settings' })
  }

  const loadUntrackedPatch = (params: { repoRoot: string; row: GitScreenRow }): Promise<GitDiffFilePatch | null> => {
    const { repoRoot, row } = params

    return serverConnectUseCase.getTransport({ hostId: host }).then((transport) => {
      return fileReadService
        .openFile({
          path: remotePathUtil.join({ dir: repoRoot, name: row.change.path }),
          transport,
        })
        .then((openResult) => {
          return accumulateUntrackedContent({ openResult, text: '', transport })
        })
        .then((untrackedContent) => {
          if (untrackedContent.isBinary) {
            return { additions: 0, deletions: 0, from: null, hunks: [], to: row.change.path }
          }

          return gitDiffParseUtil.toAddedPatch({
            content: untrackedContent.text,
            isTruncated: untrackedContent.isTruncated,
            path: row.change.path,
          })
        })
    })
  }

  const loadRowPatch = (params: { repoRoot: string; row: GitScreenRow }): Promise<GitDiffFilePatch | null> => {
    const { repoRoot, row } = params
    if (row.change.type === GitStatusChangeTypeMapper.UNTRACKED) {
      return loadUntrackedPatch({ repoRoot, row })
    }

    return serverConnectUseCase.getTransport({ hostId: host }).then((transport) => {
      return gitDiffService.getFilePatch({
        mode: diffMode,
        path: row.change.path,
        repoRoot,
        scope: diffScope,
        transport,
      })
    })
  }

  const handlePressRow = (row: GitScreenRow): void => {
    const nextIsExpanded = !row.isExpanded
    setExpandedByKey((previous) => {
      return { ...previous, [row.rowKey]: nextIsExpanded }
    })
  }

  useEffect(() => {
    if (repoState.status !== 'ready' || status === null || file === undefined) {
      return
    }
    const autoOpenKey = `${host}::${file}`
    if (autoOpenKeyRef.current === autoOpenKey) {
      return
    }
    const change = status.changes.find((statusChange) => {
      return statusChange.path === file
    })
    if (change === undefined) {
      return
    }
    autoOpenKeyRef.current = autoOpenKey
    const autoOpenRowKey = `${diffMode}::${diffScope}::${change.path}`
    setExpandedByKey((previous) => {
      return { ...previous, [autoOpenRowKey]: true }
    })
  }, [repoState, status, file, diffMode, diffScope, host])

  useEffect(() => {
    if (repoState.status !== 'ready') {
      return
    }
    const loadId = patchLoadIdRef.current
    rows
      .filter((row) => {
        return row.isExpanded && !row.isPatchLoaded && !loadingRowKeysRef.current.has(row.rowKey)
      })
      .forEach((row) => {
        loadingRowKeysRef.current.add(row.rowKey)
        void loadRowPatch({ repoRoot: repoState.repoRoot, row })
          .then((patch) => {
            if (patchLoadIdRef.current !== loadId) {
              return
            }
            setPatchByKey((previous) => {
              return { ...previous, [row.rowKey]: patch }
            })
          })
          .catch((error: unknown) => {
            if (patchLoadIdRef.current !== loadId) {
              return
            }
            setExpandedByKey((previous) => {
              if (!previous[row.rowKey]) {
                return previous
              }

              return { ...previous, [row.rowKey]: false }
            })
            Alert.alert('Diff failed', String(error))
          })
          .finally(() => {
            if (patchLoadIdRef.current !== loadId) {
              return
            }
            loadingRowKeysRef.current.delete(row.rowKey)
          })
      })
  }, [repoState, rows])

  const handleChangeLayout = (layout: GitDiffLayoutMapper): void => {
    setDiffLayout(layout)
    gitScreenUseCase.persistDiffLayout({ layout })
  }

  const handleChangeScope = (scope: GitDiffScopeMapper): void => {
    setDiffScope(scope)
    gitScreenUseCase.persistDiffScope({ scope })
  }

  const handleRefresh = (): void => {
    patchLoadIdRef.current = patchLoadIdRef.current + 1
    loadingRowKeysRef.current = new Set()
    setPatchByKey({})
    setStatusRefreshToken((previous) => {
      return previous + 1
    })
  }

  const selects: AppTopBarSelect[] = [
    {
      key: 'diff-mode',
      onChange: (value) => {
        setDiffMode(value as GitDiffModeMapper)
      },
      options: DIFF_MODE_OPTIONS,
      value: diffMode,
    },
    {
      key: 'diff-scope',
      onChange: (value) => {
        handleChangeScope(value as GitDiffScopeMapper)
      },
      options: DIFF_SCOPE_OPTIONS,
      value: diffScope,
    },
    {
      key: 'diff-layout',
      onChange: (value) => {
        handleChangeLayout(value as GitDiffLayoutMapper)
      },
      options: DIFF_LAYOUT_OPTIONS,
      value: diffLayout,
    },
  ]

  const renderPendingRepo = (): JSX.Element => {
    if (repoState.status === 'not-repo') {
      return (
        <View style={styles.pending}>
          <Text style={[styles.pendingText, { color: navigationTheme.colors.text }]}>Not a git repository</Text>
        </View>
      )
    }

    return (
      <View style={styles.pending}>
        <ActivityIndicator color={navigationTheme.colors.primary} />
      </View>
    )
  }

  return (
    <CutoutSafeArea style={[styles.safeArea, { backgroundColor: navigationTheme.colors.background }]}>
      <CollapsibleTopBar
        actions={[{ icon: 'refresh', key: 'refresh', onPress: handleRefresh, tip: 'Refresh status' }]}
        onPressMenu={openDrawer}
        onPressAbout={handlePressAbout}
        onPressSettings={handlePressSettings}
        selects={selects}
        title={status?.branch?.head ?? 'Git'}
      />
      {repoState.status === 'ready' && (
        <View style={styles.container}>
          <BranchHeader branch={status?.branch ?? null} />
          <ChangedFileList
            diffLayout={diffLayout}
            isLoading={isLoadingStatus}
            onPressRow={handlePressRow}
            rows={rows}
          />
        </View>
      )}
      {repoState.status !== 'ready' && renderPendingRepo()}
      <AppBottomBar branchName={status?.branch?.head ?? null} />
    </CutoutSafeArea>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pending: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  pendingText: {
    fontSize: 14,
    opacity: 0.7,
  },
  safeArea: {
    flex: 1,
  },
})
