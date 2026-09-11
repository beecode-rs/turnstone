import { Buffer } from 'buffer'
import { deflateRaw } from 'pako'

import { constant } from '#src/util/constant'

export const plantumlUrlUtil = {
  encodeSource(params: { source: string }): string {
    const { source } = params
    const deflatedBytes = deflateRaw(Buffer.from(source, 'utf-8'))
    const paddedLength = Math.ceil(deflatedBytes.length / 3) * 3
    const paddedBytes = Buffer.from([...deflatedBytes, 0, 0].slice(0, paddedLength))
    const byteGroups = Array.from({ length: paddedBytes.length / 3 }, (_, groupIndex) => {
      return paddedBytes.subarray(groupIndex * 3, groupIndex * 3 + 3)
    })

    return byteGroups
      .map((byteGroup) => {
        const byte1 = byteGroup[0]
        const byte2 = byteGroup[1]
        const byte3 = byteGroup[2]

        return (
          constant.plantuml.alphabet[byte1 >> 2] +
          constant.plantuml.alphabet[((byte1 & 0x3) << 4) | (byte2 >> 4)] +
          constant.plantuml.alphabet[((byte2 & 0xf) << 2) | (byte3 >> 6)] +
          constant.plantuml.alphabet[byte3 & 0x3f]
        )
      })
      .join('')
  },

  normalizeSource(params: { source: string }): string {
    const { source } = params
    if (constant.plantuml.startRegex.test(source)) {
      return source
    }

    return `@startuml\n${source}\n@enduml`
  },

  resolveDiagramUrl(params: { serverUrl: string; source: string }): string {
    const { serverUrl, source } = params
    const serverBaseUrl = serverUrl.trim().replace(/\/+$/, '')

    return `${serverBaseUrl}/png/${plantumlUrlUtil.encodeSource({
      source: plantumlUrlUtil.normalizeSource({ source }),
    })}`
  },
}
