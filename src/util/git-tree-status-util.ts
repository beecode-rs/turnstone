import { GitStatusChangeTypeMapper } from '#src/business/enum/git-status-change-type-mapper-enum'
import { GitTreeStatusKindMapper } from '#src/business/enum/git-tree-status-kind-mapper-enum'

export type GitTreeStatusChange = {
  path: string
  type: GitStatusChangeTypeMapper
}

const gitTreeStatusUtil = {
  _toStatusKind(params: { type: GitStatusChangeTypeMapper }): GitTreeStatusKindMapper | null {
    const { type } = params
    switch (type) {
      case GitStatusChangeTypeMapper.CHANGED: {
        return GitTreeStatusKindMapper.CHANGED
      }
      case GitStatusChangeTypeMapper.IGNORED: {
        return null
      }
      case GitStatusChangeTypeMapper.RENAMED: {
        return GitTreeStatusKindMapper.CHANGED
      }
      case GitStatusChangeTypeMapper.UNMERGED: {
        return GitTreeStatusKindMapper.CHANGED
      }
      case GitStatusChangeTypeMapper.UNTRACKED: {
        return GitTreeStatusKindMapper.UNTRACKED
      }
      default: {
        throw new Error('Unsupported git status change type')
      }
    }
  },
  toAbsoluteTreePath(params: { path: string; repoRoot: string }): string {
    const { path, repoRoot } = params
    const trimmedRoot = repoRoot.replace(/\/+$/, '')
    const trimmedPath = path.replace(/^\/+/, '')

    return `${trimmedRoot}/${trimmedPath}`
  },
  toPathStatusMap(params: {
    changes: GitTreeStatusChange[]
    repoRoot: string
  }): Record<string, GitTreeStatusKindMapper> {
    const { changes, repoRoot } = params

    return changes.reduce<Record<string, GitTreeStatusKindMapper>>((map, change) => {
      const statusKind = gitTreeStatusUtil._toStatusKind({ type: change.type })
      if (statusKind === null) {
        return map
      }
      const absolutePath = gitTreeStatusUtil.toAbsoluteTreePath({ path: change.path, repoRoot })

      return { ...map, [absolutePath]: statusKind }
    }, {})
  },
  toRepoRelativePath(params: { path: string; repoRoot: string }): string | null {
    const { path, repoRoot } = params
    const repoRootWithoutSlashes = repoRoot.replace(/\/+$/, '')
    if (path === repoRootWithoutSlashes) {
      return null
    }
    if (!path.startsWith(`${repoRootWithoutSlashes}/`)) {
      return null
    }
    const relativePath = path.slice(repoRootWithoutSlashes.length + 1)
    if (relativePath === '') {
      return null
    }

    return relativePath
  },
}

export { gitTreeStatusUtil }
