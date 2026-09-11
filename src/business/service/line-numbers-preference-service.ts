import { type LineNumbersPreferenceStorage } from '#src/business/model/line-numbers-preference'

export class LineNumbersPreferenceService {
  parsePreference(params: { value: string | null }): boolean {
    const { value } = params
    if (value === 'true') {
      return true
    }

    return false
  }

  async loadPreference(params: { storage: LineNumbersPreferenceStorage }): Promise<boolean> {
    const { storage } = params
    const storedValue = await storage.readPreference()

    return this.parsePreference({ value: storedValue })
  }

  async savePreference(params: { isLineNumbersHidden: boolean; storage: LineNumbersPreferenceStorage }): Promise<void> {
    const { isLineNumbersHidden, storage } = params
    await storage.writePreference({ value: String(isLineNumbersHidden) })
  }
}
