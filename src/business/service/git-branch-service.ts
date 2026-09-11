import { type SshExecResult, type SshTransport } from '#src/business/model/ssh-transport'
import { type RemoteExecService } from '#src/business/service/remote-exec-service'

export type GitBranchParams = {
  path: string
  transport: SshTransport
}

export class GitBranchService {
  protected readonly _remoteExec: RemoteExecService

  constructor(params: { remoteExec: RemoteExecService }) {
    this._remoteExec = params.remoteExec
  }

  buildBranchCommand(params: { path: string }): string {
    const { path } = params
    const quotedPath = this._remoteExec.quoteShellWord({ word: path })

    return `git -C ${quotedPath} rev-parse --abbrev-ref HEAD`
  }

  async getBranch(params: GitBranchParams): Promise<string | null> {
    const { path, transport } = params
    const outputLines: string[] = []
    const handle = this._remoteExec.execLines({
      command: this.buildBranchCommand({ path }),
      onLine: (line: string) => {
        outputLines.push(line)
      },
      transport,
    })
    const execResult = await handle.result

    return this._toBranch({ execResult, outputLines })
  }

  protected _toBranch(params: { execResult: SshExecResult; outputLines: string[] }): string | null {
    const { execResult, outputLines } = params
    if (execResult.isCancelled || execResult.exitCode !== 0) {
      return null
    }
    const branchName = (outputLines[0] ?? '').trim()
    if (branchName === '') {
      return null
    }

    return branchName
  }
}
