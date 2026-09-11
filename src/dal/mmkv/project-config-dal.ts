import { type ProjectConfig } from '#src/business/model/project-config'
import { appMmkv } from '#src/lib/mmkv'
import { constant } from '#src/util/constant'

export class ProjectConfigDal {
  list(): ProjectConfig[] {
    return this._readConfigs()
  }

  listByHost(params: { hostId: string }): ProjectConfig[] {
    const { hostId } = params

    return this._readConfigs().filter((config) => {
      return config.hostId === hostId
    })
  }

  findById(params: { id: string }): ProjectConfig | null {
    const { id } = params
    const match = this._readConfigs().find((config) => {
      return config.id === id
    })

    return match ?? null
  }

  hasStored(): boolean {
    return appMmkv.contains(constant.projectConfig.storageKey)
  }

  save(params: { config: ProjectConfig }): void {
    const { config } = params
    const withoutMatch = this._readConfigs().filter((storedConfig) => {
      return storedConfig.id !== config.id
    })
    appMmkv.set(constant.projectConfig.storageKey, JSON.stringify([...withoutMatch, config]))
  }

  saveAll(params: { configs: ProjectConfig[] }): void {
    const { configs } = params
    appMmkv.set(constant.projectConfig.storageKey, JSON.stringify(configs))
  }

  remove(params: { id: string }): void {
    const { id } = params
    const withoutMatch = this._readConfigs().filter((storedConfig) => {
      return storedConfig.id !== id
    })
    appMmkv.set(constant.projectConfig.storageKey, JSON.stringify(withoutMatch))
  }

  removeByHost(params: { hostId: string }): void {
    const { hostId } = params
    const withoutMatch = this._readConfigs().filter((storedConfig) => {
      return storedConfig.hostId !== hostId
    })
    appMmkv.set(constant.projectConfig.storageKey, JSON.stringify(withoutMatch))
  }

  protected _readConfigs(): ProjectConfig[] {
    const serialized = appMmkv.getString(constant.projectConfig.storageKey)
    if (!serialized) {
      return []
    }

    return JSON.parse(serialized) as ProjectConfig[]
  }
}
