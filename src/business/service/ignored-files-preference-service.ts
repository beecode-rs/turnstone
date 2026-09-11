import { type IgnoredFilesPreferenceStorage } from '#src/business/model/ignored-files-preference'

export class IgnoredFilesPreferenceService {
  parsePreference(params: { value: string | null }): boolean {
    const { value } = params
    if (value === 'true') {
      return true
    }

    return false
  }

  async loadPreference(params: { storage: IgnoredFilesPreferenceStorage }): Promise<boolean> {
    const { storage } = params
    const storedValue = await storage.readPreference()

    return this.parsePreference({ value: storedValue })
  }

  async savePreference(params: {
    isIgnoredFilesHidden: boolean
    storage: IgnoredFilesPreferenceStorage
  }): Promise<void> {
    const { isIgnoredFilesHidden, storage } = params
    await storage.writePreference({ value: String(isIgnoredFilesHidden) })
  }
}
