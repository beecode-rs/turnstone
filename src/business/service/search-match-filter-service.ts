import { type SearchMatch } from '#src/business/model/search-match'
import { type SshTransport } from '#src/business/model/ssh-transport'
import { FileReadService } from '#src/business/service/file-read-service'
import { GitignoreMatchService } from '#src/business/service/gitignore-match-service'
import { constant } from '#src/util/constant'
import { remotePathUtil } from '#src/util/remote-path-util'

export class SearchMatchFilterService {
  protected readonly _fileReadService: FileReadService
  protected readonly _gitignoreMatchService: GitignoreMatchService
  protected readonly _gitignoreContentByDirPath: Record<string, string | null>

  constructor() {
    this._fileReadService = new FileReadService()
    this._gitignoreMatchService = new GitignoreMatchService()
    this._gitignoreContentByDirPath = {}
  }

  async filterMatches(params: { matches: SearchMatch[]; transport: SshTransport }): Promise<SearchMatch[]> {
    const { matches, transport } = params
    await this._loadGitignoreContent({ matches, transport })

    return matches.filter((match: SearchMatch) => {
      return !this._isMatchIgnored({ match })
    })
  }

  protected _isMatchIgnored(params: { match: SearchMatch }): boolean {
    const { match } = params

    return this._gitignoreMatchService.isEntryIgnored({
      entryName: remotePathUtil.toParts({ path: match.path }).at(-1) ?? '',
      gitignoreContentByPath: this._gitignoreContentByDirPath,
      isDir: false,
      parentPath: remotePathUtil.toParentDir({ path: match.path }),
    })
  }

  protected async _loadGitignoreContent(params: { matches: SearchMatch[]; transport: SshTransport }): Promise<void> {
    const { matches, transport } = params
    const dirPaths = this._toUncachedDirPaths({ matches })
    await Promise.all(
      dirPaths.map((dirPath: string) => {
        return this._loadGitignoreForDir({ dirPath, transport })
      }),
    )
  }

  protected _toUncachedDirPaths(params: { matches: SearchMatch[] }): string[] {
    const { matches } = params
    const ancestorDirPaths = matches.reduce<string[]>((dirPaths: string[], match: SearchMatch) => {
      return [
        ...dirPaths,
        ...remotePathUtil.toAncestorDirPaths({ path: remotePathUtil.toParentDir({ path: match.path }) }),
      ]
    }, [])

    return [...new Set(ancestorDirPaths)].filter((dirPath: string) => {
      return !(dirPath in this._gitignoreContentByDirPath)
    })
  }

  protected async _loadGitignoreForDir(params: { dirPath: string; transport: SshTransport }): Promise<void> {
    const { dirPath, transport } = params
    try {
      const openResult = await this._fileReadService.openFile({
        path: remotePathUtil.join({ dir: dirPath, name: constant.gitignore.filename }),
        transport,
      })
      if (openResult.content.isBinary) {
        this._gitignoreContentByDirPath[dirPath] = null

        return
      }
      this._gitignoreContentByDirPath[dirPath] = openResult.content.text
    } catch {
      this._gitignoreContentByDirPath[dirPath] = null
    }
  }
}
