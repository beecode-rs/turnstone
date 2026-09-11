import { type HostAuthMethodMapper } from '#src/business/enum/host-auth-method-mapper-enum'

export type HostConfig = {
  authMethod: HostAuthMethodMapper
  host: string
  id: string
  label: string
  port: number
  rootPath?: string
  username: string
}
