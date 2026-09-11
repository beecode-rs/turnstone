import { type FooterPreferenceStorage } from '#src/business/model/footer-preference'

export class FooterPreferenceService {
  parsePreference(params: { value: string | null }): boolean {
    const { value } = params
    if (value === 'true') {
      return true
    }

    return false
  }

  async loadPreference(params: { storage: FooterPreferenceStorage }): Promise<boolean> {
    const { storage } = params
    const storedValue = await storage.readPreference()

    return this.parsePreference({ value: storedValue })
  }

  async savePreference(params: { isFooterHidden: boolean; storage: FooterPreferenceStorage }): Promise<void> {
    const { isFooterHidden, storage } = params
    await storage.writePreference({ value: String(isFooterHidden) })
  }
}
