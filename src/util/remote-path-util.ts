export const remotePathUtil = {
  _resolveSegments(params: { dirParts: string[]; segments: string[] }): string[] {
    const { dirParts, segments } = params

    return segments.reduce<string[]>((resolvedParts, segment) => {
      if (segment === '' || segment === '.') {
        return resolvedParts
      }
      if (segment === '..') {
        return resolvedParts.slice(0, -1)
      }

      return [...resolvedParts, segment]
    }, dirParts)
  },
  join(params: { dir: string; name: string }): string {
    const { dir, name } = params
    if (dir.endsWith('/')) {
      return `${dir}${name}`
    }

    return `${dir}/${name}`
  },

  normalizeRootPath(params: { path: string }): string {
    const { path } = params
    const trimmedPath = path.trim()
    if (!trimmedPath || trimmedPath === '/') {
      return '/'
    }
    const withoutLeadingSlashes = trimmedPath.replace(/^\/+/, '')
    const withLeadingSlash = `/${withoutLeadingSlashes}`

    return withLeadingSlash.replace(/\/+$/, '') || '/'
  },
  resolveFromFile(params: { fromFilePath: string; targetPath: string }): string {
    const { fromFilePath, targetPath } = params
    const targetWithoutDotSlash = targetPath.replace(/^\.\//, '')
    if (targetWithoutDotSlash.startsWith('/')) {
      return remotePathUtil.normalizeRootPath({ path: targetWithoutDotSlash })
    }
    const parentDir = remotePathUtil.toParentDir({ path: fromFilePath })
    const resolvedParts = remotePathUtil._resolveSegments({
      dirParts: remotePathUtil.toParts({ path: parentDir }),
      segments: targetWithoutDotSlash.split('/'),
    })

    return `/${resolvedParts.join('/')}`
  },
  toAncestorDirPaths(params: { path: string }): string[] {
    const { path } = params
    const parts = remotePathUtil.toParts({ path })

    return [
      '/',
      ...parts.map((_, index) => {
        return `/${parts.slice(0, index + 1).join('/')}`
      }),
    ]
  },
  toParentDir(params: { path: string }): string {
    const { path } = params
    const parentParts = remotePathUtil.toParts({ path }).slice(0, -1)
    if (parentParts.length === 0) {
      return '/'
    }

    return `/${parentParts.join('/')}`
  },

  toParts(params: { path: string }): string[] {
    const { path } = params

    return path.split('/').filter((part) => {
      return part.length > 0
    })
  },
  toRelativePath(params: { path: string; root: string }): string {
    const { path, root } = params
    const pathParts = remotePathUtil.toParts({ path })
    const rootParts = remotePathUtil.toParts({ path: root })
    const isUnderRoot = rootParts.every((part, index) => {
      return pathParts[index] === part
    })
    if (!isUnderRoot) {
      return pathParts.join('/')
    }

    return pathParts.slice(rootParts.length).join('/')
  },
}
