export type FileNestingPattern = {
  children: string[]
  parent: string
}

export type FileNestingPreference = {
  isEnabled: boolean
  patterns: FileNestingPattern[]
}

export type FileNestingPreferenceStorage = {
  readPreference: () => Promise<string | null>
  writePreference: (params: { value: string }) => Promise<void>
}
