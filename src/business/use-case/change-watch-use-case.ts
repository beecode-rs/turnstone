import { type SshTransport } from '#src/business/model/ssh-transport'
import { CapabilityProbeService } from '#src/business/service/capability-probe-service'
import {
  type ChangeWatcherDirectoryChange,
  type ChangeWatcherFileChange,
  ChangeWatcherService,
} from '#src/business/service/change-watcher-service'
import { RemoteExecService } from '#src/business/service/remote-exec-service'
import { TreeService } from '#src/business/service/tree-service'
import { serverConnectUseCase } from '#src/business/use-case/server-connect-use-case'

const remoteExecService = new RemoteExecService()

const changeWatcherService = new ChangeWatcherService({
  capabilityProbe: new CapabilityProbeService({ remoteExec: remoteExecService }),
  treeService: new TreeService(),
})

serverConnectUseCase.subscribeToReconnect((event) => {
  changeWatcherService.updateTransport(event)
})

export const changeWatchUseCase = {
  watchDirectories: (params: {
    getPaths: () => string[]
    hostId: string
    onReconcile: (change: ChangeWatcherDirectoryChange) => void
    transport: SshTransport
  }): (() => void) => {
    return changeWatcherService.watchDirectories(params)
  },

  watchFile: (params: {
    hostId: string
    isFocused: () => boolean
    onChange: (change: ChangeWatcherFileChange) => void
    path: string
    transport: SshTransport
  }): (() => void) => {
    return changeWatcherService.watchFile(params)
  },
}
