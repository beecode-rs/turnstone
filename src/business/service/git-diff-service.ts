import { GitDiffModeMapper } from '#src/business/enum/git-diff-mode-mapper-enum'
import { GitDiffScopeMapper } from '#src/business/enum/git-diff-scope-mapper-enum'
import { type GitDiffFilePatch, type GitDiffNumstatEntry } from '#src/business/model/git-diff'
import { type SshExecResult, type SshTransport } from '#src/business/model/ssh-transport'
import { type RemoteExecService } from '#src/business/service/remote-exec-service'
import { constant } from '#src/util/constant'
import { gitDiffParseUtil } from '#src/util/git-diff-parse-util'

export type GitDiffNumstatParams = {
  mode: GitDiffModeMapper
  repoRoot: string
  transport: SshTransport
}

export type GitDiffFilePatchParams = {
  mode: GitDiffModeMapper
  path: string
  repoRoot: string
  scope: GitDiffScopeMapper
  transport: SshTransport
}

export class GitDiffService {
  protected readonly _remoteExec: RemoteExecService

  constructor(params: { remoteExec: RemoteExecService }) {
    this._remoteExec = params.remoteExec
  }

  buildNumstatCommand(params: { mode: GitDiffModeMapper; repoRoot: string }): string {
    const { mode, repoRoot } = params
    const quotedRoot = this._remoteExec.quoteShellWord({ word: repoRoot })

    return `git -C ${quotedRoot} diff --numstat -z -M${this._toModeArg({ mode })}`
  }

  buildFileDiffCommand(params: {
    mode: GitDiffModeMapper
    path: string
    repoRoot: string
    scope: GitDiffScopeMapper
  }): string {
    const { mode, path, repoRoot, scope } = params
    const quotedRoot = this._remoteExec.quoteShellWord({ word: repoRoot })
    const quotedPath = this._remoteExec.quoteShellWord({ word: path })

    return `git -C ${quotedRoot} diff -M --no-color --no-ext-diff --no-textconv ${this._toContextArg({ scope })}${this._toModeArg({ mode })} -- ${quotedPath}`
  }

  async getNumstat(params: GitDiffNumstatParams): Promise<GitDiffNumstatEntry[]> {
    const { mode, repoRoot, transport } = params
    const outputLines: string[] = []
    const handle = this._remoteExec.execLines({
      command: this.buildNumstatCommand({ mode, repoRoot }),
      onLine: (line: string) => {
        outputLines.push(line)
      },
      transport,
    })
    const execResult = await handle.result

    return this._toNumstatEntries({ execResult, outputLines })
  }

  async getFilePatch(params: GitDiffFilePatchParams): Promise<GitDiffFilePatch | null> {
    const { mode, path, repoRoot, scope, transport } = params
    const outputLines: string[] = []
    const handle = this._remoteExec.execLines({
      command: this.buildFileDiffCommand({ mode, path, repoRoot, scope }),
      onLine: (line: string) => {
        outputLines.push(line)
      },
      transport,
    })
    const execResult = await handle.result

    return this._toFilePatch({ execResult, outputLines })
  }

  protected _toModeArg(params: { mode: GitDiffModeMapper }): string {
    const { mode } = params
    switch (mode) {
      case GitDiffModeMapper.HEAD: {
        return ' HEAD'
      }
      case GitDiffModeMapper.CACHED: {
        return ' --cached'
      }
      case GitDiffModeMapper.WORKTREE: {
        return ''
      }
      default: {
        throw new Error('Unsupported git diff mode')
      }
    }
  }

  protected _toContextArg(params: { scope: GitDiffScopeMapper }): string {
    const { scope } = params
    switch (scope) {
      case GitDiffScopeMapper.FULL: {
        return `-U${String(constant.gitDiff.fullFileContextLines)}`
      }
      case GitDiffScopeMapper.CHANGES: {
        return '-U3'
      }
      default: {
        throw new Error('Unsupported git diff scope')
      }
    }
  }

  protected _toNumstatEntries(params: { execResult: SshExecResult; outputLines: string[] }): GitDiffNumstatEntry[] {
    const { execResult, outputLines } = params
    if (execResult.isCancelled || execResult.exitCode === null) {
      throw new Error('GitDiffService numstat did not complete')
    }
    if (execResult.exitCode !== 0) {
      throw new Error(`GitDiffService numstat failed with exit code ${String(execResult.exitCode)}`)
    }

    return gitDiffParseUtil.parseNumstatOutput({ output: outputLines.at(0) ?? '' })
  }

  protected _toFilePatch(params: { execResult: SshExecResult; outputLines: string[] }): GitDiffFilePatch | null {
    const { execResult, outputLines } = params
    if (execResult.isCancelled || execResult.exitCode === null) {
      throw new Error('GitDiffService file diff did not complete')
    }
    if (execResult.exitCode !== 0) {
      throw new Error(`GitDiffService file diff failed with exit code ${String(execResult.exitCode)}`)
    }

    return gitDiffParseUtil.parseUnifiedDiff({ diffText: outputLines.join('\n') }).at(0) ?? null
  }
}
