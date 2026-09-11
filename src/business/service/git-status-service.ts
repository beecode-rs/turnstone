import { type GitStatus } from '#src/business/model/git-status'
import { type SshExecResult, type SshTransport } from '#src/business/model/ssh-transport'
import { type RemoteExecService } from '#src/business/service/remote-exec-service'
import { gitStatusParseUtil } from '#src/util/git-status-parse-util'

export type GitStatusParams = {
  repoRoot: string
  transport: SshTransport
}

export class GitStatusService {
  protected readonly _remoteExec: RemoteExecService

  constructor(params: { remoteExec: RemoteExecService }) {
    this._remoteExec = params.remoteExec
  }

  buildStatusCommand(params: { repoRoot: string }): string {
    const { repoRoot } = params
    const quotedRoot = this._remoteExec.quoteShellWord({ word: repoRoot })

    return `git -C ${quotedRoot} --no-optional-locks -c core.quotePath=false -c color.ui=never status --porcelain=v2 --branch`
  }

  async getStatus(params: GitStatusParams): Promise<GitStatus> {
    const { repoRoot, transport } = params
    const outputLines: string[] = []
    const handle = this._remoteExec.execLines({
      command: this.buildStatusCommand({ repoRoot }),
      onLine: (line: string) => {
        outputLines.push(line)
      },
      transport,
    })
    const execResult = await handle.result

    return this._toStatus({ execResult, outputLines })
  }

  protected _toStatus(params: { execResult: SshExecResult; outputLines: string[] }): GitStatus {
    const { execResult, outputLines } = params
    if (execResult.isCancelled || execResult.exitCode === null) {
      throw new Error('GitStatusService status did not complete')
    }
    if (execResult.exitCode !== 0) {
      throw new Error(`GitStatusService status failed with exit code ${String(execResult.exitCode)}`)
    }

    return gitStatusParseUtil.parseStatusLines({ lines: outputLines })
  }
}
