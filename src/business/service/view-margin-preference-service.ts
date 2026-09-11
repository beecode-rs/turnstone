import { ViewMarginPreferenceMapper } from '#src/business/enum/view-margin-preference-mapper-enum'
import { type ViewMarginPreferenceStorage } from '#src/business/model/view-margin-preference'

export class ViewMarginPreferenceService {
  parsePreference(params: { value: string | null }): ViewMarginPreferenceMapper {
    const { value } = params
    switch (value) {
      case ViewMarginPreferenceMapper.COMPACT:
        return ViewMarginPreferenceMapper.COMPACT
      case ViewMarginPreferenceMapper.LARGE:
        return ViewMarginPreferenceMapper.LARGE
      default:
        return ViewMarginPreferenceMapper.NORMAL
    }
  }

  async loadPreference(params: { storage: ViewMarginPreferenceStorage }): Promise<ViewMarginPreferenceMapper> {
    const { storage } = params
    const storedValue = await storage.readPreference()

    return this.parsePreference({ value: storedValue })
  }

  async savePreference(params: {
    margin: ViewMarginPreferenceMapper
    storage: ViewMarginPreferenceStorage
  }): Promise<void> {
    const { margin, storage } = params
    await storage.writePreference({ value: margin })
  }
}
