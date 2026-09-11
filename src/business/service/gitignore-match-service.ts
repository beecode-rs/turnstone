import ignore, { type Ignore } from 'ignore'

import { remotePathUtil } from '#src/util/remote-path-util'

type CachedIgnore = {
  content: string
  ignore: Ignore
}

type AncestorIgnore = {
  depth: number
  dirPath: string
  ignore: Ignore
}

const cachedIgnoreByDirPath = new Map<string, CachedIgnore>()

export class GitignoreMatchService {
  toLines(params: { content: string }): string[] {
    const { content } = params

    return content.split(/\r?\n/).filter((line) => {
      if (line.length === 0 || line.startsWith('#')) {
        return false
      }

      return true
    })
  }

  isEntryIgnored(params: {
    entryName: string
    gitignoreContentByPath: Record<string, string | null | undefined>
    isDir: boolean
    parentPath: string
  }): boolean {
    const { entryName, gitignoreContentByPath, isDir, parentPath } = params
    const parentParts = remotePathUtil.toParts({ path: parentPath })
    const ancestorsDeepestFirst = this._resolveAncestorsWithContent({
      gitignoreContentByPath,
      parentParts,
    }).reverse()
    const decidingOpinion = ancestorsDeepestFirst
      .map((ancestor) => {
        return ancestor.ignore.test(
          this._toRelativePath({
            ancestorDepth: ancestor.depth,
            entryName,
            isDir,
            parentParts,
          }),
        )
      })
      .find((opinion) => {
        return opinion.ignored || opinion.unignored
      })

    return decidingOpinion?.ignored === true
  }

  protected _resolveAncestorsWithContent(params: {
    gitignoreContentByPath: Record<string, string | null | undefined>
    parentParts: string[]
  }): AncestorIgnore[] {
    const { gitignoreContentByPath, parentParts } = params

    return this._resolveAncestorPaths({ parentParts })
      .filter((ancestor) => {
        return this._hasContent({ dirPath: ancestor.dirPath, gitignoreContentByPath })
      })
      .map((ancestor) => {
        return {
          ...ancestor,
          ignore: this._getIgnore({
            content: gitignoreContentByPath[ancestor.dirPath] ?? '',
            dirPath: ancestor.dirPath,
          }),
        }
      })
  }

  protected _resolveAncestorPaths(params: { parentParts: string[] }): { depth: number; dirPath: string }[] {
    const { parentParts } = params
    const prefixPaths = parentParts.map((_, index) => {
      return { depth: index + 1, dirPath: `/${parentParts.slice(0, index + 1).join('/')}` }
    })

    return [{ depth: 0, dirPath: '/' }, ...prefixPaths]
  }

  protected _hasContent(params: {
    dirPath: string
    gitignoreContentByPath: Record<string, string | null | undefined>
  }): boolean {
    const { dirPath, gitignoreContentByPath } = params
    const content = gitignoreContentByPath[dirPath]
    if (content === undefined || content === null || content === '') {
      return false
    }

    return true
  }

  protected _toRelativePath(params: {
    ancestorDepth: number
    entryName: string
    isDir: boolean
    parentParts: string[]
  }): string {
    const { ancestorDepth, entryName, isDir, parentParts } = params
    const segments = [...parentParts.slice(ancestorDepth), entryName]
    if (isDir) {
      return `${segments.join('/')}/`
    }

    return segments.join('/')
  }

  protected _getIgnore(params: { content: string; dirPath: string }): Ignore {
    const { content, dirPath } = params
    const cached = cachedIgnoreByDirPath.get(dirPath)
    if (cached?.content === content) {
      return cached.ignore
    }
    const nextIgnore = this._buildIgnore({ content })
    cachedIgnoreByDirPath.set(dirPath, { content, ignore: nextIgnore })

    return nextIgnore
  }

  protected _buildIgnore(params: { content: string }): Ignore {
    const { content } = params
    try {
      return ignore().add(this.toLines({ content }))
    } catch {
      return ignore()
    }
  }
}
