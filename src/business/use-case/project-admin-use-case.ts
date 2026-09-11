import { randomBytes } from 'crypto'

import { type ProjectConfig } from '#src/business/model/project-config'
import { type ProjectDraft } from '#src/business/model/project-draft'
import { projectSeedService } from '#src/business/service/project-seed-service'
import { ActiveProjectDal } from '#src/dal/mmkv/active-project-dal'
import { HostConfigDal } from '#src/dal/mmkv/host-config-dal'
import { ProjectConfigDal } from '#src/dal/mmkv/project-config-dal'
import { remotePathUtil } from '#src/util/remote-path-util'

export const projectAdminUseCase = {
  listProjects: (params: { hostId: string }): ProjectConfig[] => {
    const { hostId } = params
    const projectConfigDal = new ProjectConfigDal()
    if (!projectConfigDal.hasStored()) {
      const hostConfigDal = new HostConfigDal()
      projectConfigDal.saveAll({
        configs: projectSeedService.buildLegacySeeds({
          legacyRootPathByHostId: hostConfigDal.listLegacyRootPathByHostId(),
          servers: hostConfigDal.list(),
        }),
      })
    }

    return projectConfigDal.listByHost({ hostId }).sort((a, b) => {
      return a.name.localeCompare(b.name)
    })
  },

  removeProject: (params: { projectId: string }): void => {
    const { projectId } = params
    const projectConfigDal = new ProjectConfigDal()
    const project = projectConfigDal.findById({ id: projectId })
    projectConfigDal.remove({ id: projectId })
    if (project && new ActiveProjectDal().read({ hostId: project.hostId }) === projectId) {
      new ActiveProjectDal().remove({ hostId: project.hostId })
    }
  },

  saveProject(params: { draft: ProjectDraft; existingProject?: ProjectConfig; hostId: string }): ProjectConfig {
    const { draft, existingProject, hostId } = params
    const projectConfig: ProjectConfig = {
      hostId,
      id: existingProject?.id ?? randomBytes(16).toString('hex'),
      name: draft.name,
      path: remotePathUtil.normalizeRootPath({ path: draft.path }),
    }
    new ProjectConfigDal().save({ config: projectConfig })

    return projectConfig
  },

  setActiveProject: (params: { hostId: string; projectId: string }): void => {
    const { hostId, projectId } = params
    new ActiveProjectDal().write({ hostId, projectId })
  },
}
