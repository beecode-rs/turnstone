export type TreeDensityPreferenceStorage = {
  readPreference: () => Promise<string | null>
  writePreference: (params: { value: string }) => Promise<void>
}
