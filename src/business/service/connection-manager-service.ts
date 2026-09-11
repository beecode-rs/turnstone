import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native'

import { ConnectionStatusMapper } from '#src/business/enum/connection-status-mapper-enum'
import { HostAuthMethodMapper } from '#src/business/enum/host-auth-method-mapper-enum'
import { type HostConfig } from '#src/business/model/host-config'
import { type SshHostKeyVerifier, type SshTransport, type SshTransportParams } from '#src/business/model/ssh-transport'
import { type DeviceKeyService } from '#src/business/service/device-key-service'
import { type HostKeyService } from '#src/business/service/host-key-service'
import { type HostConfigDal } from '#src/dal/mmkv/host-config-dal'
import { type CredentialDal, type StoredCredentials } from '#src/dal/secure-store/credential-dal'
import { backoffUtil } from '#src/util/backoff-util'

export type TransportFactory = (params: { hostId: string; hostVerifier: SshHostKeyVerifier }) => SshTransport

export type ConnectionReconnectEvent = {
  hostId: string
  transport: SshTransport
}

export type ConnectionReconnectListener = (event: ConnectionReconnectEvent) => void

export type ConnectionManagerServiceParams = {
  credentialDal: CredentialDal
  deviceKeyService: DeviceKeyService
  hostConfigDal: HostConfigDal
  hostKeyService: HostKeyService
  transportFactory: TransportFactory
}

type ReconnectTimerId = ReturnType<typeof setTimeout>

type HostConnection = {
  hostId: string
  isDisconnectRequested: boolean
  reconnectAttempt: number
  reconnectTimerId: ReconnectTimerId | undefined
  status: ConnectionStatusMapper
  transport: SshTransport | undefined
  transportReady: Promise<SshTransport>
}

export class ConnectionManagerService {
  protected readonly _appStateSubscription: NativeEventSubscription
  protected readonly _connections: Map<string, HostConnection>
  protected readonly _params: ConnectionManagerServiceParams
  protected readonly _reconnectListeners: Set<ConnectionReconnectListener>

  constructor(params: ConnectionManagerServiceParams) {
    this._params = params
    this._connections = new Map()
    this._reconnectListeners = new Set()
    this._appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      this._onAppStateChange(nextAppState)
    })
  }

  async getTransport(params: { hostId: string }): Promise<SshTransport> {
    const { hostId } = params
    const existing = this._connections.get(hostId)
    if (!existing) {
      return this._startConnection({ hostId })
    }
    if (existing.status === ConnectionStatusMapper.RECONNECTING) {
      return this._retryConnectionNow({ entry: existing })
    }

    return existing.transportReady
  }

  disconnect(params: { hostId: string }): void {
    const { hostId } = params
    const entry = this._connections.get(hostId)
    if (!entry) {
      return
    }
    entry.isDisconnectRequested = true
    this._clearReconnectTimer({ entry })
    void entry.transportReady.catch(() => {
      return undefined
    })
    this._connections.delete(hostId)
    if (entry.transport) {
      entry.transport.disconnect()
    }
  }

  subscribeToReconnect(listener: ConnectionReconnectListener): () => void {
    this._reconnectListeners.add(listener)

    return () => {
      this._reconnectListeners.delete(listener)
    }
  }

  disconnectAll(): void {
    const hostIds = [...this._connections.keys()]
    hostIds.forEach((hostId) => {
      this.disconnect({ hostId })
    })
  }

  destroy(): void {
    this._appStateSubscription.remove()
    this.disconnectAll()
  }

  async handleAppActive(): Promise<void> {
    const entries = [...this._connections.values()]
    await Promise.all(
      entries.map((entry) => {
        return this._probeConnection({ entry })
      }),
    )
  }

  protected _onAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState !== 'active') {
      return
    }
    void this.handleAppActive()
  }

  protected _startConnection(params: { hostId: string }): Promise<SshTransport> {
    const { hostId } = params
    const entry: HostConnection = {
      hostId,
      isDisconnectRequested: false,
      reconnectAttempt: 0,
      reconnectTimerId: undefined,
      status: ConnectionStatusMapper.CONNECTING,
      transport: undefined,
      transportReady: this._createPendingTransportPromise(),
    }
    this._connections.set(hostId, entry)
    this._attachTransportReady({ entry })

    return entry.transportReady
  }

  protected _retryConnectionNow(params: { entry: HostConnection }): Promise<SshTransport> {
    const { entry } = params
    this._clearReconnectTimer({ entry })
    entry.reconnectAttempt = 0
    this._attachTransportReady({ entry })

    return entry.transportReady
  }

  protected _attachTransportReady(params: { entry: HostConnection }): void {
    const { entry } = params
    entry.status = ConnectionStatusMapper.CONNECTING
    const transportReady = this._connectTransport({ entry })
    entry.transportReady = transportReady
    void transportReady.catch(() => {
      return undefined
    })
  }

  protected async _connectTransport(params: { entry: HostConnection }): Promise<SshTransport> {
    const { entry } = params
    if (this._isConnectionCancelled(entry)) {
      throw new Error('Connection attempt was cancelled')
    }
    const config = this._params.hostConfigDal.findById({ id: entry.hostId })
    if (!config) {
      this._connections.delete(entry.hostId)
      throw new Error(`No host config found for host ${entry.hostId}`)
    }
    const credentials = await this._resolveCredentials({ config, hostId: entry.hostId })
    if (!this._hasAuthSecret({ config, credentials })) {
      this._connections.delete(entry.hostId)
      throw new Error(`No stored credential for host ${entry.hostId}`)
    }
    const transport = this._params.transportFactory({
      hostId: entry.hostId,
      hostVerifier: this._params.hostKeyService.createVerifier({ hostId: entry.hostId }),
    })
    try {
      await transport.connect({ connection: this._toTransportParams({ config, credentials }) })
    } catch (err) {
      const mismatchError = this._params.hostKeyService.takeMismatchError({ hostId: entry.hostId })
      if (mismatchError) {
        this._connections.delete(entry.hostId)
        throw mismatchError
      }
      this._onConnectionAttemptFailed({ entry })
      throw err
    }
    if (this._isConnectionCancelled(entry)) {
      transport.disconnect()
      throw new Error('Connection attempt was cancelled')
    }
    this._onTransportReady({ entry, transport })

    return transport
  }

  protected _isConnectionCancelled(entry: HostConnection): boolean {
    return entry.isDisconnectRequested
  }

  protected _onTransportReady(params: { entry: HostConnection; transport: SshTransport }): void {
    const { entry, transport } = params
    entry.reconnectAttempt = 0
    entry.status = ConnectionStatusMapper.CONNECTED
    entry.transport = transport
    transport.subscribeToClose(() => {
      this._handleTransportClosed({ entry, transport })
    })
    this._emitReconnect({ hostId: entry.hostId, transport })
  }

  protected _emitReconnect(params: { hostId: string; transport: SshTransport }): void {
    const { hostId, transport } = params
    Array.from(this._reconnectListeners).forEach((listener) => {
      listener({ hostId, transport })
    })
  }

  protected _handleTransportClosed(params: { entry: HostConnection; transport: SshTransport }): void {
    const { entry, transport } = params
    if (entry.transport !== transport) {
      return
    }
    entry.transport = undefined
    if (entry.isDisconnectRequested) {
      return
    }
    if (entry.status === ConnectionStatusMapper.RECONNECTING) {
      return
    }
    this._onConnectionLost({ entry })
  }

  protected _probeConnection(params: { entry: HostConnection }): Promise<void> {
    const { entry } = params
    const transport = entry.transport
    if (!transport) {
      return Promise.resolve()
    }

    return transport
      .stat({ path: '/' })
      .then(() => {
        return undefined
      })
      .catch(() => {
        this._onProbeFailed({ entry, transport })
      })
  }

  protected _onProbeFailed(params: { entry: HostConnection; transport: SshTransport }): void {
    const { entry, transport } = params
    if (entry.transport !== transport) {
      return
    }
    entry.transport = undefined
    entry.reconnectAttempt = 0
    this._onConnectionLost({ entry })
  }

  protected _onConnectionLost(params: { entry: HostConnection }): void {
    const { entry } = params
    if (entry.isDisconnectRequested) {
      return
    }
    this._scheduleReconnect({ delayAttempt: entry.reconnectAttempt, entry })
    entry.reconnectAttempt += 1
  }

  protected _onConnectionAttemptFailed(params: { entry: HostConnection }): void {
    this._onConnectionLost({ entry: params.entry })
  }

  protected _scheduleReconnect(params: { delayAttempt: number; entry: HostConnection }): void {
    const { delayAttempt, entry } = params
    if (entry.isDisconnectRequested) {
      return
    }
    this._clearReconnectTimer({ entry })
    entry.status = ConnectionStatusMapper.RECONNECTING
    entry.transport = undefined
    const timerId = setTimeout(
      () => {
        this._onReconnectTimer({ entry })
      },
      backoffUtil.delayMs({ attempt: delayAttempt }),
    )
    entry.reconnectTimerId = timerId
  }

  protected _onReconnectTimer(params: { entry: HostConnection }): void {
    const { entry } = params
    entry.reconnectTimerId = undefined
    this._attachTransportReady({ entry })
  }

  protected _clearReconnectTimer(params: { entry: HostConnection }): void {
    const { entry } = params
    const timerId = entry.reconnectTimerId
    if (!timerId) {
      return
    }
    clearTimeout(timerId)
    entry.reconnectTimerId = undefined
  }

  protected _hasAuthSecret(params: { config: HostConfig; credentials: StoredCredentials | null }): boolean {
    const { config, credentials } = params
    if (config.authMethod === HostAuthMethodMapper.PASSWORD) {
      return Boolean(credentials?.password)
    }

    return Boolean(credentials?.privateKey)
  }

  protected async _resolveCredentials(params: {
    config: HostConfig
    hostId: string
  }): Promise<StoredCredentials | null> {
    const { config, hostId } = params
    const stored = await this._params.credentialDal.find({ hostId })
    if (config.authMethod !== HostAuthMethodMapper.DEVICE_KEY) {
      return stored
    }

    return { privateKey: await this._findDeviceKeyPrivateKey() }
  }

  protected async _findDeviceKeyPrivateKey(): Promise<string | undefined> {
    try {
      return (await this._params.deviceKeyService.find())?.privateKey
    } catch (error) {
      // eslint-disable-next-line no-console -- keychain read failure must not crash reconnection; the missing key surfaces as a connect error
      console.warn('[device-key] unavailable for connect:', error)

      return undefined
    }
  }

  protected _toTransportParams(params: {
    config: HostConfig
    credentials: StoredCredentials | null
  }): SshTransportParams {
    const { config, credentials } = params
    if (config.authMethod === HostAuthMethodMapper.PASSWORD) {
      return {
        host: config.host,
        password: credentials?.password,
        port: config.port,
        username: config.username,
      }
    }

    return {
      host: config.host,
      passphrase: credentials?.passphrase,
      port: config.port,
      privateKey: credentials?.privateKey,
      username: config.username,
    }
  }

  protected _createPendingTransportPromise(): Promise<SshTransport> {
    return new Promise<SshTransport>(() => {
      return undefined
    })
  }
}
