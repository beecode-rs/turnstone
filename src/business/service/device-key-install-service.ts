import { HostAuthMethodMapper } from '#src/business/enum/host-auth-method-mapper-enum'
import { type HostConfig } from '#src/business/model/host-config'
import { type ServerDraft } from '#src/business/model/server-draft'
import { type SshTransport } from '#src/business/model/ssh-transport'
import { type ConnectionTestService } from '#src/business/service/connection-test-service'
import { type DeviceKeyService } from '#src/business/service/device-key-service'
import { authorizedKeyInstallUtil } from '#src/util/authorized-key-install-util'

export type DeviceKeyInstallServiceParams = {
  connectionTest: ConnectionTestService
  deviceKeyService: DeviceKeyService
}

export type DeviceKeyInstallParams = {
  draft: ServerDraft
  existingConfig?: HostConfig
  password: string
}

export class DeviceKeyInstallService {
  protected readonly _params: DeviceKeyInstallServiceParams

  constructor(params: DeviceKeyInstallServiceParams) {
    this._params = params
  }

  async install(params: DeviceKeyInstallParams): Promise<void> {
    const { draft, existingConfig, password } = params
    const deviceKey = await this._params.deviceKeyService.find()
    if (deviceKey === null) {
      throw new Error('No device key on this device - generate one in Settings first')
    }
    const transport = await this._params.connectionTest.connect({
      draft: this._toPasswordDraft({ draft, password }),
      existingConfig,
    })
    try {
      await this._installPublicKey({ publicKey: deviceKey.publicKey, transport })
    } finally {
      transport.disconnect()
    }
  }

  protected async _installPublicKey(params: { publicKey: string; transport: SshTransport }): Promise<void> {
    const { publicKey, transport } = params
    const command = authorizedKeyInstallUtil.buildCommand({ publicKey })
    const stderrChunks: string[] = []
    const execResult = await transport.exec({
      command,
      onStderrChunk: (chunk) => {
        stderrChunks.push(chunk.toString())
      },
      onStdoutChunk: () => {
        return undefined
      },
    }).result
    if (execResult.exitCode !== 0) {
      throw new Error(this._toFailureMessage({ exitCode: execResult.exitCode, stderr: stderrChunks.join('') }))
    }
  }

  protected _toExitSuffix(exitCode: number | null): string {
    if (exitCode === null) {
      return 'no exit code'
    }

    return `exit code ${String(exitCode)}`
  }

  protected _toFailureMessage(params: { exitCode: number | null; stderr: string }): string {
    const { exitCode, stderr } = params
    const stderrText = stderr.trim()
    if (stderrText === '') {
      return `Key install failed (${this._toExitSuffix(exitCode)})`
    }

    return `Key install failed (${this._toExitSuffix(exitCode)}): ${stderrText}`
  }

  protected _toPasswordDraft(params: { draft: ServerDraft; password: string }): ServerDraft {
    const { draft, password } = params

    return {
      ...draft,
      authMethod: HostAuthMethodMapper.PASSWORD,
      passphrase: undefined,
      password,
      privateKey: undefined,
    }
  }
}
