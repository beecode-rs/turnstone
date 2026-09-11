export type PlantumlServerPreference = {
  customServerUrl: string
  isCustomServerEnabled: boolean
  isSelfSignedCertificateIgnored: boolean
}

export type PlantumlServerPreferenceStorage = {
  readPreference: () => Promise<string | null>
  writePreference: (params: { value: string }) => Promise<void>
}
