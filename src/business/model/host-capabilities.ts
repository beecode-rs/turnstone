import { type HostPlatformMapper } from '#src/business/enum/host-platform-mapper-enum'

export type HostCapabilities = {
  gitVersion: string | null
  isInotifyAvailable: boolean
  isRipgrepAvailable: boolean
  platform: HostPlatformMapper
}
