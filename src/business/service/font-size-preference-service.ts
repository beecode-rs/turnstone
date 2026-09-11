import { FontSizePreferenceMapper } from '#src/business/enum/font-size-preference-mapper-enum'
import { type FontSizePreferenceStorage } from '#src/business/model/font-size-preference'

export class FontSizePreferenceService {
  parsePreference(params: { value: string | null }): FontSizePreferenceMapper {
    const { value } = params
    switch (value) {
      case FontSizePreferenceMapper.L:
        return FontSizePreferenceMapper.L
      case FontSizePreferenceMapper.M:
        return FontSizePreferenceMapper.M
      case FontSizePreferenceMapper.S:
        return FontSizePreferenceMapper.S
      case FontSizePreferenceMapper.XL:
        return FontSizePreferenceMapper.XL
      case FontSizePreferenceMapper.XS:
        return FontSizePreferenceMapper.XS
      case FontSizePreferenceMapper.XXL:
        return FontSizePreferenceMapper.XXL
      default:
        return FontSizePreferenceMapper.M
    }
  }

  async loadPreference(params: { storage: FontSizePreferenceStorage }): Promise<FontSizePreferenceMapper> {
    const { storage } = params
    const storedValue = await storage.readPreference()

    return this.parsePreference({ value: storedValue })
  }

  async savePreference(params: {
    fontSize: FontSizePreferenceMapper
    storage: FontSizePreferenceStorage
  }): Promise<void> {
    const { fontSize, storage } = params
    await storage.writePreference({ value: fontSize })
  }
}
