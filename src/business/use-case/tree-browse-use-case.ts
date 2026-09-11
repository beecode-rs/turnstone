import { type FileNestingPreference } from '#src/business/model/file-nesting-preference'
import { type ProjectConfig } from '#src/business/model/project-config'
import { type SshTransport } from '#src/business/model/ssh-transport'
import { type TreeRowItem } from '#src/business/model/tree-browser'
import { type TreeEntry } from '#src/business/model/tree-entry'
import { FileNestingMatchService } from '#src/business/service/file-nesting-match-service'
import { FileReadService } from '#src/business/service/file-read-service'
import { GitignoreMatchService } from '#src/business/service/gitignore-match-service'
import { TreeService } from '#src/business/service/tree-service'
import { ActiveProjectDal } from '#src/dal/mmkv/active-project-dal'
import { ProjectConfigDal } from '#src/dal/mmkv/project-config-dal'
import { TreeCacheDal } from '#src/dal/mmkv/tree-cache-dal'
import { TreeExpansionDal } from '#src/dal/mmkv/tree-expansion-dal'
import { TreeSelectionDal } from '#src/dal/mmkv/tree-selection-dal'
import { constant } from '#src/util/constant'
import { remotePathUtil } from '#src/util/remote-path-util'
import { treeCacheValidityUtil } from '#src/util/tree-cache-validity-util'
import { treeExpansionUtil } from '#src/util/tree-expansion-util'

const treeService = new TreeService()
const treeCacheDal = new TreeCacheDal()
const treeExpansionDal = new TreeExpansionDal()
const treeSelectionDal = new TreeSelectionDal()
const fileReadService = new FileReadService()
const fileNestingMatchService = new FileNestingMatchService()
const gitignoreMatchService = new GitignoreMatchService()

export const treeBrowseUseCase = {
  buildRows(params: {
    childrenByPath: Record<string, TreeEntry[] | undefined>
    expandedPaths: Record<string, boolean>
    fileNesting?: FileNestingPreference
    gitignoreContentByPath?: Record<string, string | null>
    isDotFilesHidden?: boolean
    isIgnoredFilesHidden?: boolean
    rootPath: string
  }): TreeRowItem[] {
    const isVisibleEntry = (entry: TreeEntry, parentPath: string): boolean => {
      if (params.isDotFilesHidden && entry.name.startsWith('.')) {
        return false
      }
      if (!params.isIgnoredFilesHidden) {
        return true
      }

      return !gitignoreMatchService.isEntryIgnored({
        entryName: entry.name,
        gitignoreContentByPath: params.gitignoreContentByPath ?? {},
        isDir: entry.isDir,
        parentPath,
      })
    }
    const resolveNests = (visibleEntries: TreeEntry[]): Record<string, TreeEntry[]> => {
      if (!params.fileNesting?.isEnabled) {
        return {}
      }

      return fileNestingMatchService.buildNests({
        entries: visibleEntries,
        patterns: params.fileNesting.patterns,
      }).childrenByParentName
    }
    const toNestedChildRow = (childEntry: TreeEntry, parentPath: string, depth: number): TreeRowItem => {
      return {
        depth: depth + 1,
        entry: childEntry,
        hasNestedChildren: false,
        isExpanded: false,
        path: remotePathUtil.join({ dir: parentPath, name: childEntry.name }),
      }
    }
    const collectRows = (entries: TreeEntry[], parentPath: string, depth: number): TreeRowItem[] => {
      const visibleEntries = entries.filter((entry) => {
        return isVisibleEntry(entry, parentPath)
      })
      const childrenByParentName = resolveNests(visibleEntries)
      const nestedChildNames = new Set(
        Object.values(childrenByParentName).reduce<string[]>((names, childEntries) => {
          return [
            ...names,
            ...childEntries.map((childEntry) => {
              return childEntry.name
            }),
          ]
        }, []),
      )

      return visibleEntries
        .filter((entry) => {
          return !nestedChildNames.has(entry.name)
        })
        .reduce<TreeRowItem[]>((rows, entry) => {
          const path = remotePathUtil.join({ dir: parentPath, name: entry.name })
          const nestedChildren = childrenByParentName[entry.name] ?? []
          const hasNestedChildren = !entry.isDir && nestedChildren.length > 0
          const isExpandable = entry.isDir || hasNestedChildren
          const isExpanded = isExpandable && params.expandedPaths[path]
          const row: TreeRowItem = { depth, entry, hasNestedChildren, isExpanded, path }
          if (!isExpanded) {
            return [...rows, row]
          }
          if (entry.isDir) {
            const childEntries = params.childrenByPath[path] ?? []

            return [...rows, row, ...collectRows(childEntries, path, depth + 1)]
          }

          return [
            ...rows,
            row,
            ...nestedChildren.map((childEntry) => {
              return toNestedChildRow(childEntry, parentPath, depth)
            }),
          ]
        }, [])
    }
    const rootEntries = params.childrenByPath[params.rootPath] ?? []

    return collectRows(rootEntries, params.rootPath, 0)
  },

  loadDirectory: async (params: {
    hostId: string
    isForceRefresh?: boolean
    path: string
    transport: SshTransport
  }): Promise<TreeEntry[]> => {
    const dirStat = await params.transport.stat({ path: params.path })
    if (!dirStat.isDirectory) {
      return []
    }
    const cachedRecord = treeCacheDal.read({ hostId: params.hostId, path: params.path })
    if (!params.isForceRefresh) {
      const isCacheValid = treeCacheValidityUtil.isCacheValid({
        cache: cachedRecord,
        currentDirMtime: dirStat.modifiedAtSeconds,
      })
      if (isCacheValid && cachedRecord) {
        return cachedRecord.children
      }
    }
    const entries = await treeService.listDirectory({ path: params.path, transport: params.transport })
    treeCacheDal.write({
      hostId: params.hostId,
      path: params.path,
      record: { children: entries, dirMtime: dirStat.modifiedAtSeconds },
    })

    return entries
  },

  loadExpandedPaths: (params: { hostId: string }): Record<string, boolean> => {
    const record = treeExpansionDal.read({ hostId: params.hostId })

    return treeExpansionUtil.toExpandedPathsMap({ paths: record?.expandedPaths ?? [] })
  },

  loadGitignoreForDirectory: async (params: {
    entries: TreeEntry[]
    path: string
    transport: SshTransport
  }): Promise<string | null> => {
    const gitignoreEntry = params.entries.find((entry) => {
      return !entry.isDir && entry.name === constant.gitignore.filename
    })
    if (!gitignoreEntry) {
      return null
    }
    try {
      const openResult = await fileReadService.openFile({
        path: remotePathUtil.join({ dir: params.path, name: constant.gitignore.filename }),
        size: gitignoreEntry.size,
        transport: params.transport,
      })
      if (openResult.content.isBinary) {
        return null
      }

      return openResult.content.text
    } catch {
      return null
    }
  },

  loadSelectedPath: (params: { hostId: string }): string | null => {
    return treeSelectionDal.read({ hostId: params.hostId })?.path ?? null
  },

  persistExpandedPaths: (params: { hostId: string; expandedPaths: Record<string, boolean> }): void => {
    treeExpansionDal.write({
      hostId: params.hostId,
      record: {
        expandedPaths: treeExpansionUtil.toExpandedPathsList({ expandedPaths: params.expandedPaths }),
      },
    })
  },

  persistSelectedPath: (params: { hostId: string; path: string | null }): void => {
    treeSelectionDal.write({ hostId: params.hostId, record: { path: params.path } })
  },

  readCachedChildren: (params: { hostId: string; path: string }): TreeEntry[] | null => {
    return treeCacheDal.read({ hostId: params.hostId, path: params.path })?.children ?? null
  },

  resolveProject: (params: { hostId: string; projectId?: string }): ProjectConfig | undefined => {
    const { hostId, projectId } = params
    const resolvedProjectId = projectId ?? new ActiveProjectDal().read({ hostId }) ?? undefined
    if (resolvedProjectId === undefined) {
      return undefined
    }

    return new ProjectConfigDal().findById({ id: resolvedProjectId }) ?? undefined
  },

  resolveRootPath: (params: { hostId: string; projectId?: string }): string => {
    return treeBrowseUseCase.resolveProject(params)?.path ?? '/'
  },
}
