import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router'
import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, BackHandler, StyleSheet, View } from 'react-native'

import { type GitTreeStatusKindMapper } from '#src/business/enum/git-tree-status-kind-mapper-enum'
import { type SshTransport } from '#src/business/model/ssh-transport'
import { type TreeRowItem } from '#src/business/model/tree-browser'
import { type TreeEntry } from '#src/business/model/tree-entry'
import { GitDetectService } from '#src/business/service/git-detect-service'
import { GitStatusService } from '#src/business/service/git-status-service'
import { RemoteExecService } from '#src/business/service/remote-exec-service'
import { changeWatchUseCase } from '#src/business/use-case/change-watch-use-case'
import { serverAdminUseCase } from '#src/business/use-case/server-admin-use-case'
import { serverConnectUseCase } from '#src/business/use-case/server-connect-use-case'
import { treeBrowseUseCase } from '#src/business/use-case/tree-browse-use-case'
import { AppBottomBar } from '#src/ui-component/app-bottom-bar'
import { type AppTopBarMenuAction } from '#src/ui-component/app-top-bar'
import { CollapsibleTopBar } from '#src/ui-component/collapsible-top-bar'
import { CutoutSafeArea } from '#src/ui-component/cutout-safe-area'
import { useAlwaysOpenDrawer } from '#src/ui-component/open-screens/always-open-drawer-context'
import { OpenFileScreens } from '#src/ui-component/open-screens/open-file-screens'
import { useOpenScreens } from '#src/ui-component/open-screens/open-screens-context'
import { OpenScreensDrawer } from '#src/ui-component/open-screens/open-screens-drawer'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { useDotFiles } from '#src/ui-component/tree/dot-files-context'
import { useFileNesting } from '#src/ui-component/tree/file-nesting-context'
import { useIgnoredFiles } from '#src/ui-component/tree/ignored-files-context'
import { TreeBrowser } from '#src/ui-component/tree/tree-browser'
import { gitTreeStatusUtil } from '#src/util/git-tree-status-util'

const gitDetectService = new GitDetectService({ remoteExec: new RemoteExecService() })
const gitStatusService = new GitStatusService({ remoteExec: new RemoteExecService() })

const resolveMenuActions = (params: {
  isGitRepo: boolean
  onPressGit: () => void
  onPressSearch: () => void
}): AppTopBarMenuAction[] => {
  const { isGitRepo, onPressGit, onPressSearch } = params
  if (!isGitRepo) {
    return [{ icon: 'magnify', key: 'search', onPress: onPressSearch, title: 'Search files' }]
  }

  return [
    { icon: 'git', key: 'git', onPress: onPressGit, title: 'Git status' },
    { icon: 'magnify', key: 'search', onPress: onPressSearch, title: 'Search files' },
  ]
}

export const TreeController = (): JSX.Element => {
  const { host, project } = useLocalSearchParams<{ host: string; project?: string }>()
  const { navigationTheme } = useThemePreference()
  const { activateFile, activeFilePath, closeDrawer, closeFile, openDrawer, openFile, reset, setHost } =
    useOpenScreens()
  const { isAlwaysOpenDrawer } = useAlwaysOpenDrawer()
  const { isDotFilesHidden } = useDotFiles()
  const { fileNesting } = useFileNesting()
  const { isIgnoredFilesHidden } = useIgnoredFiles()
  const [childrenByPath, setChildrenByPath] = useState<Record<string, TreeEntry[] | undefined>>({})
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({})
  const [gitBranchName, setGitBranchName] = useState<string | null>(null)
  const [gitRepoRoot, setGitRepoRoot] = useState<string | null>(null)
  const [gitStatusByPath, setGitStatusByPath] = useState<Record<string, GitTreeStatusKindMapper>>({})
  const [gitignoreContentByPath, setGitignoreContentByPath] = useState<Record<string, string | null>>({})
  const [isActiveRoute, setIsActiveRoute] = useState(true)
  const [isLoadingRoot, setIsLoadingRoot] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const rootPath = useMemo(() => {
    return treeBrowseUseCase.resolveRootPath({ hostId: host, projectId: project })
  }, [host, project])
  const navigation = useNavigation()
  const isRouteFocusedRef = useRef(false)

  const rows = useMemo(() => {
    return treeBrowseUseCase.buildRows({
      childrenByPath,
      expandedPaths,
      fileNesting,
      gitignoreContentByPath,
      isDotFilesHidden,
      isIgnoredFilesHidden,
      rootPath,
    })
  }, [
    childrenByPath,
    expandedPaths,
    fileNesting,
    gitignoreContentByPath,
    isDotFilesHidden,
    isIgnoredFilesHidden,
    rootPath,
  ])
  const rowsRef = useRef<TreeRowItem[]>(rows)
  const expandedPathsRef = useRef(expandedPaths)
  const gitStatusLoadIdRef = useRef(0)

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  useEffect(() => {
    expandedPathsRef.current = expandedPaths
  }, [expandedPaths])

  useFocusEffect(
    useCallback(() => {
      isRouteFocusedRef.current = true
      setIsActiveRoute(true)

      return () => {
        isRouteFocusedRef.current = false
        setIsActiveRoute(false)
      }
    }, []),
  )

  useEffect(() => {
    return () => {
      reset()
    }
  }, [reset])

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isRouteFocusedRef.current) {
        return false
      }
      if (activeFilePath !== null) {
        closeFile({ path: activeFilePath })

        return true
      }

      return false
    })

    return () => {
      subscription.remove()
    }
  }, [activeFilePath, closeFile])

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: activeFilePath === null })
  }, [activeFilePath, navigation])

  const serverLabel = useMemo(() => {
    return serverAdminUseCase.listServers().find((server) => {
      return server.id === host
    })?.label
  }, [host])
  const projectName = useMemo(() => {
    return treeBrowseUseCase.resolveProject({ hostId: host, projectId: project })?.name
  }, [host, project])
  const treeTitle = projectName ?? serverLabel ?? 'Files'
  const selectedDetailPath = useMemo(() => {
    if (selectedPath === null) {
      return null
    }

    return gitTreeStatusUtil.toRepoRelativePath({ path: selectedPath, repoRoot: rootPath }) ?? selectedPath
  }, [rootPath, selectedPath])

  const handlePressAbout = (): void => {
    router.navigate({ pathname: '/about' })
  }

  const handlePressSettings = (): void => {
    router.navigate({ pathname: '/settings' })
  }

  const handlePressCodeBlock = (): void => {
    router.navigate({ params: { host }, pathname: '/code-block/[host]' })
  }

  const handleDrawerPressTree = (): void => {
    closeDrawer()
    activateFile({ path: null })
    router.navigate({ params: { host }, pathname: '/tree/[host]' })
  }

  const handleDrawerPressFile = (params: { path: string }): void => {
    const { path } = params
    closeDrawer()
    activateFile({ path })
    router.navigate({ params: { host }, pathname: '/tree/[host]' })
  }

  const handleDrawerPressProjects = (): void => {
    closeDrawer()
    router.back()
  }

  const handleDrawerCloseFile = (params: { path: string }): void => {
    const { path } = params
    closeFile({ path })
  }

  const renderDrawer = (params: { isPersistent: boolean }): JSX.Element => {
    const { isPersistent } = params

    return (
      <OpenScreensDrawer
        isPersistent={isPersistent}
        onCloseFile={handleDrawerCloseFile}
        onPressFile={handleDrawerPressFile}
        onPressProjects={handleDrawerPressProjects}
        onPressTree={handleDrawerPressTree}
        treeLabel={treeTitle}
      />
    )
  }

  const isPersistentDrawerVisible = isAlwaysOpenDrawer && activeFilePath === null

  const renderPersistentDrawer = (): JSX.Element | null => {
    if (!isPersistentDrawerVisible) {
      return null
    }

    return renderDrawer({ isPersistent: true })
  }

  const renderModalDrawer = (): JSX.Element | null => {
    if (isPersistentDrawerVisible) {
      return null
    }

    return renderDrawer({ isPersistent: false })
  }

  const resolveOnPressMenu = (): (() => void) | undefined => {
    if (isPersistentDrawerVisible) {
      return undefined
    }

    return openDrawer
  }

  const storeGitignoreContent = (params: { entries: TreeEntry[]; path: string; transport: SshTransport }): void => {
    const { entries, path, transport } = params
    void treeBrowseUseCase.loadGitignoreForDirectory({ entries, path, transport }).then((content) => {
      setGitignoreContentByPath((previous) => {
        return { ...previous, [path]: content }
      })
    })
  }

  const loadDirectoryTree = (path: string, options?: { isSilent?: boolean }): Promise<void> => {
    const cachedChildren = treeBrowseUseCase.readCachedChildren({ hostId: host, path })
    if (cachedChildren) {
      setChildrenByPath((previous) => {
        return { ...previous, [path]: cachedChildren }
      })
    }

    return serverConnectUseCase
      .getTransport({ hostId: host })
      .then((transport) => {
        if (cachedChildren) {
          storeGitignoreContent({ entries: cachedChildren, path, transport })
        }

        return treeBrowseUseCase.loadDirectory({ hostId: host, path, transport }).then((entries) => {
          return { entries, transport }
        })
      })
      .then((result) => {
        setChildrenByPath((previous) => {
          return { ...previous, [path]: result.entries }
        })
        storeGitignoreContent({ entries: result.entries, path, transport: result.transport })
      })
      .catch((error: unknown) => {
        if (options?.isSilent) {
          return
        }
        Alert.alert('Browse failed', `${path}\n${String(error)}`)
      })
  }

  useEffect(() => {
    setIsLoadingRoot(true)
    void loadDirectoryTree(rootPath).finally(() => {
      setIsLoadingRoot(false)
    })
  }, [rootPath])

  useEffect(() => {
    setHost({ hostId: host })
  }, [host, setHost])

  useEffect(() => {
    const restoredExpandedPaths = treeBrowseUseCase.loadExpandedPaths({ hostId: host })
    const restoredSelectedPath = treeBrowseUseCase.loadSelectedPath({ hostId: host })
    setExpandedPaths(restoredExpandedPaths)
    setSelectedPath(restoredSelectedPath)
    Object.keys(restoredExpandedPaths).forEach((path) => {
      void loadDirectoryTree(path, { isSilent: true })
    })
  }, [host])

  const loadGitStatus = (repoRoot: string): void => {
    const loadId = gitStatusLoadIdRef.current + 1
    gitStatusLoadIdRef.current = loadId
    void serverConnectUseCase
      .getTransport({ hostId: host })
      .then((transport) => {
        return gitStatusService.getStatus({ repoRoot, transport })
      })
      .then((status) => {
        if (gitStatusLoadIdRef.current !== loadId) {
          return
        }
        setGitStatusByPath(gitTreeStatusUtil.toPathStatusMap({ changes: status.changes, repoRoot }))
        setGitBranchName(status.branch?.head ?? null)
      })
      .catch(() => {
        return
      })
  }

  useEffect(() => {
    setGitRepoRoot(null)
    setGitStatusByPath({})
    setGitBranchName(null)
    void serverConnectUseCase
      .getTransport({ hostId: host })
      .then((transport) => {
        return gitDetectService.detect({ hostId: host, path: rootPath, transport })
      })
      .then((detection) => {
        if (detection.status === 'repo') {
          setGitRepoRoot(detection.toplevel)
          loadGitStatus(detection.toplevel)

          return
        }
        setGitRepoRoot(null)
      })
      .catch(() => {
        setGitRepoRoot(null)
      })
  }, [host, rootPath])

  const resolveWatchedDirectoryPaths = (): string[] => {
    const expandedDirPaths = rowsRef.current
      .filter((row) => {
        return row.entry.isDir && row.isExpanded
      })
      .map((row) => {
        return row.path
      })

    return Array.from(new Set([rootPath, ...expandedDirPaths]))
  }

  useEffect(() => {
    const unsubscribeWatch: { current: (() => void) | null } = { current: null }
    const cancelState = { isCancelled: false }
    void serverConnectUseCase
      .getTransport({ hostId: host })
      .then((transport) => {
        if (cancelState.isCancelled) {
          return
        }
        unsubscribeWatch.current = changeWatchUseCase.watchDirectories({
          getPaths: resolveWatchedDirectoryPaths,
          hostId: host,
          onReconcile: (change) => {
            setChildrenByPath((previous) => {
              return { ...previous, [change.path]: change.children }
            })
          },
          transport,
        })
      })
      .catch(() => {
        return undefined
      })

    return () => {
      cancelState.isCancelled = true
      unsubscribeWatch.current?.()
    }
  }, [host])

  const selectRow = (row: TreeRowItem): void => {
    setSelectedPath(row.path)
    treeBrowseUseCase.persistSelectedPath({ hostId: host, path: row.path })
  }

  const handleFileOpen = (row: TreeRowItem): void => {
    selectRow(row)
    openFile({ path: row.path })
  }

  const applyExpandedPath = (params: { isExpanded: boolean; path: string }): void => {
    const { isExpanded, path } = params
    const nextExpandedPaths = { ...expandedPathsRef.current, [path]: isExpanded }
    expandedPathsRef.current = nextExpandedPaths
    setExpandedPaths(nextExpandedPaths)
    treeBrowseUseCase.persistExpandedPaths({ expandedPaths: nextExpandedPaths, hostId: host })
  }

  const resolveMissingDirPaths = (params: { path: string }): string[] => {
    const { path } = params
    const requiredPaths = [
      path,
      ...Object.keys(expandedPathsRef.current).filter((expandedPath) => {
        return expandedPath.startsWith(`${path}/`)
      }),
    ]

    return requiredPaths.filter((requiredPath) => {
      return childrenByPath[requiredPath] === undefined
    })
  }

  const expandDirRow = (row: TreeRowItem): void => {
    const missingDirPaths = resolveMissingDirPaths({ path: row.path })
    if (missingDirPaths.length === 0) {
      applyExpandedPath({ isExpanded: true, path: row.path })

      return
    }
    void Promise.all(
      missingDirPaths.map((dirPath) => {
        return loadDirectoryTree(dirPath, { isSilent: dirPath !== row.path })
      }),
    ).then(() => {
      applyExpandedPath({ isExpanded: true, path: row.path })
    })
  }

  const handleDirToggle = (row: TreeRowItem): void => {
    if (row.entry.isDir && !row.isExpanded) {
      expandDirRow(row)

      return
    }
    applyExpandedPath({ isExpanded: !row.isExpanded, path: row.path })
  }

  const handleRowPress = (row: TreeRowItem): void => {
    selectRow(row)
    if (row.entry.isDir || row.hasNestedChildren) {
      handleDirToggle(row)
    }
  }

  const handleSearchPress = (): void => {
    router.navigate({
      params: { host, root: rootPath },
      pathname: '/search/[host]',
    })
  }

  const handleGitPress = (): void => {
    router.navigate({
      params: { host, root: gitRepoRoot ?? rootPath },
      pathname: '/git/[host]',
    })
  }

  const handleViewDiffFile = (params: { path: string }): void => {
    const { path } = params
    if (gitRepoRoot === null) {
      return
    }
    const relativePath = gitTreeStatusUtil.toRepoRelativePath({ path, repoRoot: gitRepoRoot })
    router.navigate({
      params: { file: relativePath ?? path, host, root: gitRepoRoot },
      pathname: '/git/[host]',
    })
  }

  const handleRefresh = (): void => {
    const expandedDirPaths = rows
      .filter((row) => {
        return row.entry.isDir && row.isExpanded
      })
      .map((row) => {
        return row.path
      })
    const pathsToRefresh = [rootPath, ...expandedDirPaths]
    setIsRefreshing(true)
    if (gitRepoRoot !== null) {
      loadGitStatus(gitRepoRoot)
    }
    void serverConnectUseCase
      .getTransport({ hostId: host })
      .then((transport) => {
        return Promise.all(
          pathsToRefresh.map((path) => {
            return treeBrowseUseCase
              .loadDirectory({ hostId: host, isForceRefresh: true, path, transport })
              .then((entries) => {
                return { entries, path }
              })
          }),
        ).then((results) => {
          return { results, transport }
        })
      })
      .then((loadResult) => {
        setChildrenByPath((previous) => {
          return loadResult.results.reduce<Record<string, TreeEntry[] | undefined>>((next, result) => {
            return { ...next, [result.path]: result.entries }
          }, previous)
        })
        loadResult.results.forEach((result) => {
          storeGitignoreContent({ entries: result.entries, path: result.path, transport: loadResult.transport })
        })
      })
      .catch((error: unknown) => {
        Alert.alert('Refresh failed', String(error))
      })
      .finally(() => {
        setIsRefreshing(false)
      })
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: navigationTheme.colors.background }]}>
      <View style={styles.contentRow}>
        {renderPersistentDrawer()}
        <View style={styles.mainColumn}>
          <CutoutSafeArea style={styles.safeArea}>
            <CollapsibleTopBar
              actions={[{ icon: 'refresh', key: 'refresh', onPress: handleRefresh, tip: 'Refresh' }]}
              menuActions={resolveMenuActions({
                isGitRepo: gitRepoRoot !== null,
                onPressGit: handleGitPress,
                onPressSearch: handleSearchPress,
              })}
              onPressAbout={handlePressAbout}
              onPressMenu={resolveOnPressMenu()}
              onPressSettings={handlePressSettings}
              title={treeTitle}
            />
            <TreeBrowser
              gitStatusByPath={gitStatusByPath}
              isGitRepo={gitRepoRoot !== null}
              isLoading={isLoadingRoot}
              isRefreshing={isRefreshing}
              onOpenFile={handleFileOpen}
              onPressRow={handleRowPress}
              onRefresh={handleRefresh}
              onViewDiffFile={(row) => {
                handleViewDiffFile({ path: row.path })
              }}
              rows={rows}
              selectedPath={selectedPath}
            />
            <AppBottomBar branchName={gitBranchName} detailText={selectedDetailPath} />
          </CutoutSafeArea>
          <OpenFileScreens
            gitRepoRoot={gitRepoRoot}
            gitStatusByPath={gitStatusByPath}
            hostId={host}
            isActiveRoute={isActiveRoute}
            onCodeBlockPress={handlePressCodeBlock}
            onPressAbout={handlePressAbout}
            onPressSettings={handlePressSettings}
            onViewDiff={handleViewDiffFile}
          />
        </View>
      </View>
      {renderModalDrawer()}
    </View>
  )
}

const styles = StyleSheet.create({
  contentRow: {
    flex: 1,
    flexDirection: 'row',
  },
  mainColumn: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
})
