export type AlwaysOpenDrawerPreferenceStorage = {
  readPreference: () => Promise<string | null>
  writePreference: (params: { value: string }) => Promise<void>
}
