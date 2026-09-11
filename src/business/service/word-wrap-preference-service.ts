import { type WordWrapPreferenceStorage } from '#src/business/model/word-wrap-preference'

export class WordWrapPreferenceService {
  parsePreference(params: { value: string | null }): boolean {
    const { value } = params
    if (value === 'true') {
      return true
    }

    return false
  }

  async loadPreference(params: { storage: WordWrapPreferenceStorage }): Promise<boolean> {
    const { storage } = params
    const storedValue = await storage.readPreference()

    return this.parsePreference({ value: storedValue })
  }

  async savePreference(params: { isWordWrapEnabled: boolean; storage: WordWrapPreferenceStorage }): Promise<void> {
    const { isWordWrapEnabled, storage } = params
    await storage.writePreference({ value: String(isWordWrapEnabled) })
  }
}
