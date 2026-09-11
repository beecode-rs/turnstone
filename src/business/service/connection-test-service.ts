import { HostAuthMethodMapper } from '#src/business/enum/host-auth-method-mapper-enum'
import { type HostConfig } from '#src/business/model/host-config'
import { type ServerDraft } from '#src/business/model/server-draft'
import { type SshTransport, type SshTransportParams } from '#src/business/model/ssh-transport'
import { type TransportFactory } from '#src/business/service/connection-manager-service'
import { type DeviceKeyService } from '#src/business/service/device-key-service'
import { type HostKeyService } from '#src/business/service/host-key-service'
import { type CredentialDal, type StoredCredentials } from '#src/dal/secure-store/credential-dal'
import { draftHostIdUtil } from '#src/util/draft-host-id-util'

export type ConnectionTestParams = {
  draft: ServerDraft
  existingConfig?: HostConfig
}

export type ConnectionTestServiceParams = {
  credentialDal: CredentialDal
  deviceKeyService: DeviceKeyService
  hostKeyService: HostKeyService
  transportFactory: TransportFactory
}

export class ConnectionTestService {
  protected readonly _params: ConnectionTestServiceParams

  constructor(params: ConnectionTestServiceParams) {
    this._params = params
  }

  async connect(params: ConnectionTestParams): Promise<SshTransport> {
    const { draft, existingConfig } = params
    const hostId = this._resolveHostId({ draft, existingConfig })
    const credentials = await this._resolveCredentials({ draft, hostId })
    this._assertHasSecret({ credentials, draft })
    const transport = this._params.transportFactory({
      hostId,
      hostVerifier: this._params.hostKeyService.createVerifier({ hostId }),
    })
    try {
      await transport.connect({ connection: this._toTransportParams({ credentials, draft }) })
    } catch (err) {
      const mismatchError = this._params.hostKeyService.takeMismatchError({ hostId })
      if (mismatchError) {
        throw mismatchError
      }
      throw err
    }

    return transport
  }

  async test(params: ConnectionTestParams): Promise<void> {
    const transport = await this.connect(params)
    transport.disconnect()
  }

  protected _resolveHostId(params: ConnectionTestParams): string {
    const { draft, existingConfig } = params
    if (existingConfig) {
      return existingConfig.id
    }

    return draftHostIdUtil.forConnection({
      host: draft.host,
      port: draft.port,
      username: draft.username,
    })
  }

  protected async _resolveCredentials(params: { draft: ServerDraft; hostId: string }): Promise<StoredCredentials> {
    const { draft, hostId } = params
    const stored = await this._params.credentialDal.find({ hostId })
    if (draft.authMethod === HostAuthMethodMapper.DEVICE_KEY) {
      return { privateKey: await this._findDeviceKeyPrivateKey() }
    }

    return {
      passphrase: draft.passphrase ?? stored?.passphrase,
      password: draft.password ?? stored?.password,
      privateKey: draft.privateKey ?? stored?.privateKey,
    }
  }

  protected async _findDeviceKeyPrivateKey(): Promise<string | undefined> {
    try {
      return (await this._params.deviceKeyService.find())?.privateKey
    } catch (error) {
      // eslint-disable-next-line no-console -- keychain read failure must not crash connect; the missing key surfaces as a connect error
      console.warn('[device-key] unavailable for connect:', error)

      return undefined
    }
  }

  protected _assertHasSecret(params: { credentials: StoredCredentials; draft: ServerDraft }): void {
    const { credentials, draft } = params
    if (draft.authMethod === HostAuthMethodMapper.PASSWORD && !credentials.password) {
      throw new Error('Connection test requires a password for password authentication')
    }
    if (draft.authMethod === HostAuthMethodMapper.KEY && !credentials.privateKey) {
      throw new Error('Connection test requires a private key for key authentication')
    }
    if (draft.authMethod === HostAuthMethodMapper.DEVICE_KEY && !credentials.privateKey) {
      throw new Error('Connection test requires a device key - generate one in Settings first')
    }
  }

  protected _toTransportParams(params: { credentials: StoredCredentials; draft: ServerDraft }): SshTransportParams {
    const { credentials, draft } = params
    if (draft.authMethod === HostAuthMethodMapper.PASSWORD) {
      return {
        host: draft.host,
        password: credentials.password,
        port: draft.port,
        username: draft.username,
      }
    }

    return {
      host: draft.host,
      passphrase: credentials.passphrase,
      port: draft.port,
      privateKey: credentials.privateKey,
      username: draft.username,
    }
  }
}
