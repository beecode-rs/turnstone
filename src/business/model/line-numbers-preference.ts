export type LineNumbersPreferenceStorage = {
  readPreference: () => Promise<string | null>
  writePreference: (params: { value: string }) => Promise<void>
}
