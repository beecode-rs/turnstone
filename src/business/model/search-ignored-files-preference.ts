export type SearchIgnoredFilesPreferenceStorage = {
  readPreference: () => Promise<string | null>
  writePreference: (params: { value: string }) => Promise<void>
}
