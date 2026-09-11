import { randomBytes } from 'crypto'

import { type HostConfig } from '#src/business/model/host-config'
import { type ServerDraft } from '#src/business/model/server-draft'
import { ActiveProjectDal } from '#src/dal/mmkv/active-project-dal'
import { HostConfigDal } from '#src/dal/mmkv/host-config-dal'
import { OpenScreensDal } from '#src/dal/mmkv/open-screens-dal'
import { ProjectConfigDal } from '#src/dal/mmkv/project-config-dal'
import { TreeExpansionDal } from '#src/dal/mmkv/tree-expansion-dal'
import { TreeSelectionDal } from '#src/dal/mmkv/tree-selection-dal'
import { CredentialDal } from '#src/dal/secure-store/credential-dal'
import { KnownHostDal } from '#src/dal/secure-store/known-host-dal'
import { remotePathUtil } from '#src/util/remote-path-util'

export const serverAdminUseCase = {
  listServers: (): HostConfig[] => {
    return new HostConfigDal().list().sort((a, b) => {
      return a.label.localeCompare(b.label)
    })
  },

  removeServer: async (params: { hostId: string }): Promise<void> => {
    new HostConfigDal().remove({ id: params.hostId })
    await new CredentialDal().remove({ hostId: params.hostId })
    await new KnownHostDal().remove({ hostId: params.hostId })
    new TreeExpansionDal().remove({ hostId: params.hostId })
    new TreeSelectionDal().remove({ hostId: params.hostId })
    new OpenScreensDal().remove({ hostId: params.hostId })
    new ProjectConfigDal().removeByHost({ hostId: params.hostId })
    new ActiveProjectDal().remove({ hostId: params.hostId })
  },

  saveServer: async (params: { draft: ServerDraft; existingConfig?: HostConfig }): Promise<HostConfig> => {
    const hostConfig: HostConfig = {
      authMethod: params.draft.authMethod,
      host: params.draft.host,
      id: params.existingConfig?.id ?? randomBytes(16).toString('hex'),
      label: params.draft.label,
      port: params.draft.port,
      rootPath: remotePathUtil.normalizeRootPath({ path: params.draft.rootPath ?? '/' }),
      username: params.draft.username,
    }
    new HostConfigDal().save({ config: hostConfig })
    if (params.draft.passphrase || params.draft.password || params.draft.privateKey) {
      await new CredentialDal().save({
        credentials: {
          passphrase: params.draft.passphrase,
          password: params.draft.password,
          privateKey: params.draft.privateKey,
        },
        hostId: hostConfig.id,
      })
    }

    return hostConfig
  },
}
