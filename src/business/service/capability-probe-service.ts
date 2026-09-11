import { type HostCapabilities } from '#src/business/model/host-capabilities'
import { type SshTransport } from '#src/business/model/ssh-transport'
import { type RemoteExecService } from '#src/business/service/remote-exec-service'
import { capabilityProbeUtil } from '#src/util/capability-probe-util'

export type CapabilityProbeParams = {
  hostId: string
  transport: SshTransport
}

export class CapabilityProbeService {
  protected _capabilitiesByHostId: Record<string, HostCapabilities | undefined>
  protected readonly _remoteExec: RemoteExecService

  constructor(params: { remoteExec: RemoteExecService }) {
    this._capabilitiesByHostId = {}
    this._remoteExec = params.remoteExec
  }

  buildProbeCommand(): string {
    return 'command -v rg; command -v inotifywait; git --version; uname -s'
  }

  async probe(params: CapabilityProbeParams): Promise<HostCapabilities> {
    const { hostId, transport } = params
    const cachedCapabilities = this._capabilitiesByHostId[hostId] ?? null
    if (cachedCapabilities !== null) {
      return cachedCapabilities
    }
    const capabilities = await this._probeRemote({ hostId, transport })
    this._capabilitiesByHostId = { ...this._capabilitiesByHostId, [hostId]: capabilities }

    return capabilities
  }

  protected async _probeRemote(params: CapabilityProbeParams): Promise<HostCapabilities> {
    const { transport } = params
    const outputLines: string[] = []
    const handle = this._remoteExec.execLines({
      command: this.buildProbeCommand(),
      onLine: (line: string) => {
        outputLines.push(line)
      },
      transport,
    })
    const execResult = await handle.result
    if (execResult.isCancelled || execResult.exitCode === null) {
      throw new Error('CapabilityProbeService probe did not complete')
    }

    return capabilityProbeUtil.parseProbeLines({ lines: outputLines })
  }
}
