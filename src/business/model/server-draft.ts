import { type HostAuthMethodMapper } from '#src/business/enum/host-auth-method-mapper-enum'

export type ServerDraft = {
  authMethod: HostAuthMethodMapper
  host: string
  label: string
  passphrase?: string
  password?: string
  port: number
  privateKey?: string
  rootPath?: string
  username: string
}
