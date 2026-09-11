import { type DisplayCutoutPreferenceStorage } from '#src/business/model/display-cutout-preference'

export class DisplayCutoutPreferenceService {
  parsePreference(params: { value: string | null }): boolean {
    const { value } = params
    if (value === 'true') {
      return true
    }

    return false
  }

  async loadPreference(params: { storage: DisplayCutoutPreferenceStorage }): Promise<boolean> {
    const { storage } = params
    const storedValue = await storage.readPreference()

    return this.parsePreference({ value: storedValue })
  }

  async savePreference(params: {
    isContentBehindCutout: boolean
    storage: DisplayCutoutPreferenceStorage
  }): Promise<void> {
    const { isContentBehindCutout, storage } = params
    await storage.writePreference({ value: String(isContentBehindCutout) })
  }
}
