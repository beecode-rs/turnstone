import { Buffer } from 'buffer'
import { createHash } from 'crypto'

export const fingerprintUtil = {
  sha256Fingerprint(params: { hostKey: Uint8Array }): string {
    const { hostKey } = params
    const digestBase64 = createHash('sha256').update(Buffer.from(hostKey)).digest('base64')

    return `SHA256:${digestBase64.replace(/=+$/, '')}`
  },
}
