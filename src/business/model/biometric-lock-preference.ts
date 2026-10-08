export type BiometricLockPreferenceStorage = {
  readPreference: () => Promise<string | null>
  writePreference: (params: { value: string }) => Promise<void>
}
