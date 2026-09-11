import { TreeDensityPreferenceMapper } from '#src/business/enum/tree-density-preference-mapper-enum'
import { type TreeDensityPreferenceStorage } from '#src/business/model/tree-density-preference'

export class TreeDensityPreferenceService {
  parsePreference(params: { value: string | null }): TreeDensityPreferenceMapper {
    const { value } = params
    switch (value) {
      case TreeDensityPreferenceMapper.COMPACT:
        return TreeDensityPreferenceMapper.COMPACT
      case TreeDensityPreferenceMapper.WIDE:
        return TreeDensityPreferenceMapper.WIDE
      default:
        return TreeDensityPreferenceMapper.DEFAULT
    }
  }

  async loadPreference(params: { storage: TreeDensityPreferenceStorage }): Promise<TreeDensityPreferenceMapper> {
    const { storage } = params
    const storedValue = await storage.readPreference()

    return this.parsePreference({ value: storedValue })
  }

  async savePreference(params: {
    density: TreeDensityPreferenceMapper
    storage: TreeDensityPreferenceStorage
  }): Promise<void> {
    const { density, storage } = params
    await storage.writePreference({ value: density })
  }
}
