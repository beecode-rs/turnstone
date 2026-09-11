import { type HostKeyVerification } from '#src/business/model/host-key'
import { type SshHostKeyVerifier, type SshTransport } from '#src/business/model/ssh-transport'
import {
  ConnectionManagerService,
  type ConnectionReconnectListener,
} from '#src/business/service/connection-manager-service'
import { type ConnectionTestParams, ConnectionTestService } from '#src/business/service/connection-test-service'
import { type DeviceKeyInstallParams, DeviceKeyInstallService } from '#src/business/service/device-key-install-service'
import { DeviceKeyService } from '#src/business/service/device-key-service'
import { HostKeyService } from '#src/business/service/host-key-service'
import { TreeService } from '#src/business/service/tree-service'
import { HostConfigDal } from '#src/dal/mmkv/host-config-dal'
import { CredentialDal } from '#src/dal/secure-store/credential-dal'
import { DeviceKeyDal } from '#src/dal/secure-store/device-key-dal'
import { KnownHostDal } from '#src/dal/secure-store/known-host-dal'
import { Ssh2Client } from '#src/lib/ssh2-client'

const hostKeyService = new HostKeyService({ knownHostDal: new KnownHostDal() })

const deviceKeyService = new DeviceKeyService({ deviceKeyDal: new DeviceKeyDal() })

const transportFactory = (params: { hostId: string; hostVerifier: SshHostKeyVerifier }): SshTransport => {
  return new Ssh2Client({ hostVerifier: params.hostVerifier })
}

const connectionManager = new ConnectionManagerService({
  credentialDal: new CredentialDal(),
  deviceKeyService,
  hostConfigDal: new HostConfigDal(),
  hostKeyService,
  transportFactory,
})

const connectionTest = new ConnectionTestService({
  credentialDal: new CredentialDal(),
  deviceKeyService,
  hostKeyService,
  transportFactory,
})

const deviceKeyInstall = new DeviceKeyInstallService({ connectionTest, deviceKeyService })

const treeService = new TreeService()

export type ServerBrowseSession = {
  disconnect: () => void
  listDirectories: (params: { path: string }) => Promise<string[]>
}

export const serverConnectUseCase = {
  acceptHostKey: (params: { hostId: string }): Promise<void> => {
    return hostKeyService.acceptPendingHostKey(params)
  },

  connect: (params: { hostId: string }): Promise<void> => {
    return connectionManager.getTransport(params).then(() => {
      return undefined
    })
  },

  disconnect: (params: { hostId: string }): void => {
    connectionManager.disconnect(params)
  },

  getTransport: (params: { hostId: string }): Promise<SshTransport> => {
    return connectionManager.getTransport(params)
  },

  installDeviceKey: (params: DeviceKeyInstallParams): Promise<void> => {
    return deviceKeyInstall.install(params)
  },

  openBrowseSession: (params: ConnectionTestParams): Promise<ServerBrowseSession> => {
    return connectionTest.connect(params).then((transport) => {
      return {
        disconnect: () => {
          transport.disconnect()
        },
        listDirectories: (listParams: { path: string }) => {
          return treeService.listSubdirectoryNames({ path: listParams.path, transport })
        },
      }
    })
  },

  rejectHostKey: (params: { hostId: string }): void => {
    hostKeyService.rejectPendingHostKey(params)
    connectionManager.disconnect(params)
  },

  removeStoredHostKey: (params: { hostId: string }): Promise<void> => {
    return hostKeyService.removeStoredHostKey(params)
  },

  subscribeToReconnect: (listener: ConnectionReconnectListener): (() => void) => {
    return connectionManager.subscribeToReconnect(listener)
  },

  subscribeToVerification: (callback: (verification: HostKeyVerification) => void): (() => void) => {
    return hostKeyService.subscribeToVerification(callback)
  },

  testConnection: (params: ConnectionTestParams): Promise<void> => {
    return connectionTest.test(params)
  },
}
