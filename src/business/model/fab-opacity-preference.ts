export type FabOpacityPreference = number

export type FabOpacityPreferenceStorage = {
  readPreference: () => Promise<string | null>
  writePreference: (params: { value: string }) => Promise<void>
}
