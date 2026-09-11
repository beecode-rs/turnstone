// Supplements: ../../../lib/node-crypto-algorithm-names.contract.yaml
// Covers: the metro crypto stub must surface react-native-quick-crypto's full API while reporting Node-compatible lowercase algorithm names - ssh2 filters its cipher and MAC negotiation lists through getCiphers/getHashes at module load, so uppercase OpenSSL names empty the handshake offer (module-shape wiring with a mocked native module contract.yaml cannot express)

import { describe, expect, it, vi } from 'vitest'

vi.mock('react-native-quick-crypto', () => {
  return {
    createCipheriv: () => {
      return { isMockCipher: true }
    },
    getCiphers: () => {
      return ['AES-128-CTR', 'AES-256-GCM', 'CHACHA20-POLY1305']
    },
    getHashes: () => {
      return ['SHA256', 'SHA1', 'MD5']
    },
    install: () => {
      return undefined
    },
  }
})

describe('crypto stub node algorithm names', () => {
  it('reports ciphers as lowercase node openssl names', async () => {
    const cryptoStub = await import('#src/__internal__/polyfill-stubs/crypto')

    expect(cryptoStub.getCiphers()).toEqual(['aes-128-ctr', 'aes-256-gcm', 'chacha20-poly1305'])
  })

  it('reports hashes as lowercase node openssl names', async () => {
    const cryptoStub = await import('#src/__internal__/polyfill-stubs/crypto')

    expect(cryptoStub.getHashes()).toEqual(['sha256', 'sha1', 'md5'])
  })

  it('passes every other quick-crypto export through untouched', async () => {
    const cryptoStub = await import('#src/__internal__/polyfill-stubs/crypto')

    expect(cryptoStub.install).toBeTypeOf('function')
    expect(cryptoStub.createCipheriv('aes-128-ctr', 'key', 'iv')).toEqual({ isMockCipher: true })
  })
})
