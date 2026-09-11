import { type SearchIgnoredFilesPreferenceStorage } from '#src/business/model/search-ignored-files-preference'

export class SearchIgnoredFilesPreferenceService {
  parsePreference(params: { value: string | null }): boolean {
    const { value } = params
    if (value === 'true') {
      return true
    }

    return false
  }

  async loadPreference(params: { storage: SearchIgnoredFilesPreferenceStorage }): Promise<boolean> {
    const { storage } = params
    const storedValue = await storage.readPreference()

    return this.parsePreference({ value: storedValue })
  }

  async savePreference(params: {
    isSearchIgnoredFilesIncluded: boolean
    storage: SearchIgnoredFilesPreferenceStorage
  }): Promise<void> {
    const { isSearchIgnoredFilesIncluded, storage } = params
    await storage.writePreference({ value: String(isSearchIgnoredFilesIncluded) })
  }
}
