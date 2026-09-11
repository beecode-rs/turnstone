import { type HostConfig } from '#src/business/model/host-config'
import { type ProjectConfig } from '#src/business/model/project-config'
import { remotePathUtil } from '#src/util/remote-path-util'

export const projectSeedService = {
  buildLegacySeeds(params: { legacyRootPathByHostId: Record<string, string>; servers: HostConfig[] }): ProjectConfig[] {
    const { legacyRootPathByHostId, servers } = params
    const toSeed = (server: HostConfig): ProjectConfig => {
      const path = remotePathUtil.normalizeRootPath({ path: legacyRootPathByHostId[server.id] ?? '/' })

      return {
        hostId: server.id,
        id: `legacy-project-${server.id}`,
        name: remotePathUtil.toParts({ path }).at(-1) ?? server.label,
        path,
      }
    }

    return servers.map(toSeed)
  },
}
