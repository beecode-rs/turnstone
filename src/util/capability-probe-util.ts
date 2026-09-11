import { HostPlatformMapper } from '#src/business/enum/host-platform-mapper-enum'

export type CapabilityProbeCapabilities = {
  gitVersion: string | null
  isInotifyAvailable: boolean
  isRipgrepAvailable: boolean
  platform: HostPlatformMapper
}

const capabilityProbeUtil = {
  _extractGitVersion(params: { lines: string[] }): string | null {
    const { lines } = params
    const versionLine = lines.find((line: string) => {
      return line.startsWith('git version ')
    })
    if (versionLine === undefined) {
      return null
    }

    return versionLine.slice('git version '.length).trim()
  },
  _isToolPathLine(params: { line: string; toolName: string }): boolean {
    const { line, toolName } = params
    if (line === toolName) {
      return true
    }

    return line.endsWith(`/${toolName}`)
  },
  _toPlatform(line: string | null): HostPlatformMapper {
    if (line === null) {
      return HostPlatformMapper.OTHER
    }
    const platform = line.toLowerCase() as HostPlatformMapper
    switch (platform) {
      case HostPlatformMapper.DARWIN: {
        return HostPlatformMapper.DARWIN
      }
      case HostPlatformMapper.LINUX: {
        return HostPlatformMapper.LINUX
      }
      default: {
        return HostPlatformMapper.OTHER
      }
    }
  },
  parseProbeLines(params: { lines: string[] }): CapabilityProbeCapabilities {
    const { lines } = params
    const meaningfulLines = lines
      .map((line: string) => {
        return line.trim()
      })
      .filter((line: string) => {
        return line !== ''
      })

    return {
      gitVersion: capabilityProbeUtil._extractGitVersion({ lines: meaningfulLines }),
      isInotifyAvailable: meaningfulLines.some((line: string) => {
        return capabilityProbeUtil._isToolPathLine({ line, toolName: 'inotifywait' })
      }),
      isRipgrepAvailable: meaningfulLines.some((line: string) => {
        return capabilityProbeUtil._isToolPathLine({ line, toolName: 'rg' })
      }),
      platform: capabilityProbeUtil._toPlatform(meaningfulLines.at(-1) ?? null),
    }
  },
}

export { capabilityProbeUtil }
