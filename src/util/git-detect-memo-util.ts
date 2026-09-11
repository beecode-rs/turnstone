export type GitDetectDetection = { gitDir: string; status: 'repo'; toplevel: string } | { status: 'not-repo' }

export type GitDetectMemoState = Record<string, GitDetectDetection>

const gitDetectMemoUtil = {
  _ancestorsOf(path: string): string[] {
    const parent = gitDetectMemoUtil.parentPath(path)
    if (parent === null) {
      return []
    }

    return [parent, ...gitDetectMemoUtil._ancestorsOf(parent)]
  },
  _pathsAffectedBy(params: { detection: GitDetectDetection; path: string }): string[] {
    const { detection, path } = params
    if (detection.status === 'not-repo') {
      return [path, ...gitDetectMemoUtil._ancestorsOf(path)]
    }
    const { toplevel } = detection
    if (toplevel === path) {
      return [path]
    }

    return [path, toplevel]
  },
  buildKey(params: { hostId: string; path: string }): string {
    const { hostId, path } = params

    return `${hostId}#${gitDetectMemoUtil.normalizePath(path)}`
  },
  lookup(params: { hostId: string; path: string; state: GitDetectMemoState }): GitDetectDetection | null {
    const { hostId, path, state } = params

    return state[gitDetectMemoUtil.buildKey({ hostId, path })] ?? null
  },
  normalizePath(path: string): string {
    const stripped = path.replace(/\/+$/, '')
    if (stripped === '') {
      return '/'
    }

    return stripped
  },
  parentPath(path: string): string | null {
    const normalized = gitDetectMemoUtil.normalizePath(path)
    if (normalized === '/') {
      return null
    }
    const lastSlashIndex = normalized.lastIndexOf('/')
    if (lastSlashIndex === 0) {
      return '/'
    }

    return normalized.slice(0, lastSlashIndex)
  },
  record(params: {
    detection: GitDetectDetection
    hostId: string
    path: string
    state: GitDetectMemoState
  }): GitDetectMemoState {
    const { detection, hostId, path, state } = params
    const normalizedPath = gitDetectMemoUtil.normalizePath(path)
    const pathsToRecord = gitDetectMemoUtil._pathsAffectedBy({ detection, path: normalizedPath })

    return pathsToRecord.reduce<GitDetectMemoState>((state, pathToRecord) => {
      return { ...state, [`${hostId}#${pathToRecord}`]: detection }
    }, state)
  },
}

export { gitDetectMemoUtil }
