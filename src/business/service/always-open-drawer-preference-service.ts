import { type AlwaysOpenDrawerPreferenceStorage } from '#src/business/model/always-open-drawer-preference'

export class AlwaysOpenDrawerPreferenceService {
  parsePreference(params: { value: string | null }): boolean {
    const { value } = params
    if (value === 'true') {
      return true
    }

    return false
  }

  async loadPreference(params: { storage: AlwaysOpenDrawerPreferenceStorage }): Promise<boolean> {
    const { storage } = params
    const storedValue = await storage.readPreference()

    return this.parsePreference({ value: storedValue })
  }

  async savePreference(params: {
    isAlwaysOpenDrawer: boolean
    storage: AlwaysOpenDrawerPreferenceStorage
  }): Promise<void> {
    const { isAlwaysOpenDrawer, storage } = params
    await storage.writePreference({ value: String(isAlwaysOpenDrawer) })
  }
}
