import { type BiometricLockPreferenceStorage } from '#src/business/model/biometric-lock-preference'

export class BiometricLockPreferenceService {
  parsePreference(params: { value: string | null }): boolean {
    const { value } = params
    if (value === 'true') {
      return true
    }

    return false
  }

  async loadPreference(params: { storage: BiometricLockPreferenceStorage }): Promise<boolean> {
    const { storage } = params
    const storedValue = await storage.readPreference()

    return this.parsePreference({ value: storedValue })
  }

  async savePreference(params: {
    isBiometricLockEnabled: boolean
    storage: BiometricLockPreferenceStorage
  }): Promise<void> {
    const { isBiometricLockEnabled, storage } = params
    await storage.writePreference({ value: String(isBiometricLockEnabled) })
  }
}
