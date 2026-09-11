import { type GitRepoDetection } from '#src/business/model/git-repo'
import { type SshExecResult, type SshFileStat, type SshTransport } from '#src/business/model/ssh-transport'
import { type RemoteExecService } from '#src/business/service/remote-exec-service'
import { type GitDetectMemoState, gitDetectMemoUtil } from '#src/util/git-detect-memo-util'

export type GitDetectParams = {
  hostId: string
  path: string
  transport: SshTransport
}

export class GitDetectService {
  protected _memoState: GitDetectMemoState
  protected readonly _remoteExec: RemoteExecService

  constructor(params: { remoteExec: RemoteExecService }) {
    this._memoState = {}
    this._remoteExec = params.remoteExec
  }

  buildRevParseCommand(params: { path: string }): string {
    const { path } = params
    const normalizedPath = gitDetectMemoUtil.normalizePath(path)

    return `git -C ${this._remoteExec.quoteShellWord({ word: normalizedPath })} rev-parse --show-toplevel --git-dir`
  }

  async detect(params: GitDetectParams): Promise<GitRepoDetection> {
    const { hostId, path, transport } = params
    const cachedDetection = gitDetectMemoUtil.lookup({
      hostId,
      path,
      state: this._memoState,
    })
    if (cachedDetection !== null) {
      return cachedDetection
    }
    const detection = await this._resolveRepoState({ hostId, path, transport })
    this._memoState = gitDetectMemoUtil.record({
      detection,
      hostId,
      path,
      state: this._memoState,
    })

    return detection
  }

  protected async _resolveRepoState(params: GitDetectParams): Promise<GitRepoDetection> {
    const { path, transport } = params
    const dotGitStat = await this._statDotGit({ path, transport })
    if (dotGitStat?.isDirectory) {
      return this._toRootRepoDetection({ path })
    }

    return this._revParse({ path, transport })
  }

  protected _revParse(params: { path: string; transport: SshTransport }): Promise<GitRepoDetection> {
    const { path, transport } = params
    const outputLines: string[] = []
    const handle = this._remoteExec.execLines({
      command: this.buildRevParseCommand({ path }),
      onLine: (line: string) => {
        outputLines.push(line)
      },
      transport,
    })

    return handle.result.then((execResult: SshExecResult) => {
      return this._toDetection({ execResult, outputLines, path })
    })
  }

  protected async _statDotGit(params: { path: string; transport: SshTransport }): Promise<SshFileStat | null> {
    const { path, transport } = params
    const dotGitPath = `${gitDetectMemoUtil.normalizePath(path)}/.git`
    try {
      return await transport.lstat({ path: dotGitPath })
    } catch {
      return null
    }
  }

  protected _toAbsoluteGitDir(params: { gitDir: string; path: string }): string {
    const { gitDir, path } = params
    if (gitDir.startsWith('/')) {
      return gitDir
    }
    const toplevel = gitDetectMemoUtil.normalizePath(path)

    return `${toplevel}/${gitDir}`
  }

  protected _toDetection(params: { execResult: SshExecResult; outputLines: string[]; path: string }): GitRepoDetection {
    const { execResult, outputLines, path } = params
    if (execResult.isCancelled || execResult.exitCode === null) {
      throw new Error('GitDetectService rev-parse did not complete')
    }
    if (execResult.exitCode !== 0 || outputLines.length < 2) {
      return { status: 'not-repo' }
    }
    const toplevel = outputLines[0]
    const rawGitDir = outputLines[1]

    return {
      gitDir: this._toAbsoluteGitDir({ gitDir: rawGitDir, path }),
      status: 'repo',
      toplevel,
    }
  }

  protected _toRootRepoDetection(params: { path: string }): GitRepoDetection {
    const { path } = params
    const toplevel = gitDetectMemoUtil.normalizePath(path)

    return { gitDir: `${toplevel}/.git`, status: 'repo', toplevel }
  }
}
