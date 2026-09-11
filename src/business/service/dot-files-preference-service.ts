import { type DotFilesPreferenceStorage } from '#src/business/model/dot-files-preference'

export class DotFilesPreferenceService {
  parsePreference(params: { value: string | null }): boolean {
    const { value } = params
    if (value === 'true') {
      return true
    }

    return false
  }

  async loadPreference(params: { storage: DotFilesPreferenceStorage }): Promise<boolean> {
    const { storage } = params
    const storedValue = await storage.readPreference()

    return this.parsePreference({ value: storedValue })
  }

  async savePreference(params: { isDotFilesHidden: boolean; storage: DotFilesPreferenceStorage }): Promise<void> {
    const { isDotFilesHidden, storage } = params
    await storage.writePreference({ value: String(isDotFilesHidden) })
  }
}
