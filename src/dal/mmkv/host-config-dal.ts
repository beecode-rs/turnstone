import { type HostConfig } from '#src/business/model/host-config'
import { appMmkv } from '#src/lib/mmkv'
import { constant } from '#src/util/constant'

export class HostConfigDal {
  list(): HostConfig[] {
    return this._readStoredConfigs()
  }

  findById(params: { id: string }): HostConfig | null {
    const { id } = params
    const match = this.list().find((config) => {
      return config.id === id
    })

    return match ?? null
  }

  listLegacyRootPathByHostId(): Record<string, string> {
    return this._readStoredConfigs().reduce<Record<string, string>>((rootPathByHostId, storedConfig) => {
      if (storedConfig.rootPath === undefined) {
        return rootPathByHostId
      }

      return { ...rootPathByHostId, [storedConfig.id]: storedConfig.rootPath }
    }, {})
  }

  save(params: { config: HostConfig }): void {
    const { config } = params
    const withoutMatch = this.list().filter((storedConfig) => {
      return storedConfig.id !== config.id
    })
    appMmkv.set(constant.hostConfig.storageKey, JSON.stringify([...withoutMatch, config]))
  }

  remove(params: { id: string }): void {
    const { id } = params
    const withoutMatch = this.list().filter((storedConfig) => {
      return storedConfig.id !== id
    })
    appMmkv.set(constant.hostConfig.storageKey, JSON.stringify(withoutMatch))
  }

  protected _readStoredConfigs(): HostConfig[] {
    const serialized = appMmkv.getString(constant.hostConfig.storageKey)
    if (!serialized) {
      return []
    }

    return JSON.parse(serialized) as HostConfig[]
  }
}
