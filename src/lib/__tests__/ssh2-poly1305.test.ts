// Supplements: ../ssh2-poly1305.ts
// Covers: rfc 8439 poly1305 correctness under ssh2's wasm module contract (verified against tweetnacl and ssh2's bundled wasm binary) - binary Uint8Array params and the cwrap-returned function cannot be expressed in contract.yaml

import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

import { ssh2Poly1305 } from '#src/lib/ssh2-poly1305'

type WasmLikeTagReader = (
  outPtr: number,
  segmentA: Uint8Array,
  segmentALength: number,
  segmentB: Uint8Array,
  segmentBLength: number,
  key: Uint8Array,
) => void

type WasmLikeModule = {
  HEAPU8: Uint8Array
  _malloc: (bytes: number) => number
  cwrap: (functionName: string, returnType: null, argTypes: string[]) => WasmLikeTagReader
}

const requireFromRepo = createRequire(import.meta.url)
const createSsh2WasmModule = requireFromRepo('ssh2/lib/protocol/crypto/poly1305.js') as () => Promise<WasmLikeModule>

const hexToBytes = (hex: string): Uint8Array => {
  return Uint8Array.from(hex.match(/../gu) ?? [], (byte) => {
    return Number.parseInt(byte, 16)
  })
}

const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes, (byte) => {
    return byte.toString(16).padStart(2, '0')
  }).join('')
}

const readTagHex = (wasmLikeModule: WasmLikeModule, poly1305Auth: WasmLikeTagReader, outPtr: number): string => {
  return bytesToHex(new Uint8Array(wasmLikeModule.HEAPU8.buffer, outPtr, 16))
}

const computeTagHex = async (params: {
  key: Uint8Array
  segmentA: Uint8Array
  segmentALength: number
  segmentB: Uint8Array
  segmentBLength: number
}): Promise<string> => {
  const wasmLikeModule = await ssh2Poly1305.createModule()
  const outPtr = wasmLikeModule._malloc(16)
  const poly1305Auth = wasmLikeModule.cwrap('poly1305_auth', null, [
    'number',
    'array',
    'number',
    'array',
    'number',
    'array',
  ])
  poly1305Auth(outPtr, params.segmentA, params.segmentALength, params.segmentB, params.segmentBLength, params.key)

  return readTagHex(wasmLikeModule, poly1305Auth, outPtr)
}

const rfc8439Key = hexToBytes('856be78575556d337f4452fe42d506a8010380afbf0db2fd4abff6af4149f51b')
const rfc8439Message = new TextEncoder().encode('Cryptographic Forum Research Group')

describe('ssh2Poly1305', () => {
  it('computes the rfc 8439 tag for a message split across segments', async () => {
    const tagHex = await computeTagHex({
      key: rfc8439Key,
      segmentA: rfc8439Message.subarray(0, 16),
      segmentALength: 16,
      segmentB: rfc8439Message.subarray(16),
      segmentBLength: rfc8439Message.length - 16,
    })

    expect(tagHex).toBe('071884ead1563aaa18b30f29085ead3b')
  })

  it('computes the tag for a length-and-payload pair like the chacha20-poly1305 cipher path', async () => {
    const tagHex = await computeTagHex({
      key: hexToBytes('0100000000000000000000000000000000000000000000000000000000000000'),
      segmentA: hexToBytes('00000100'),
      segmentALength: 4,
      segmentB: Uint8Array.from({ length: 33 }, () => {
        return 0xab
      }),
      segmentBLength: 33,
    })

    expect(tagHex).toBe('56575857025957575757575757575757')
  })

  it('computes the tag for short mixed segments', async () => {
    const tagHex = await computeTagHex({
      key: hexToBytes('9d6b5c2fa1e84f30d7c6b5a4938f2e1155c0a97e3f6d2c8b41a9de7f05c3b628'),
      segmentA: hexToBytes('5acabe31'),
      segmentALength: 4,
      segmentB: hexToBytes('0f5542109c8f6fa1b2d4f7'),
      segmentBLength: 11,
    })

    expect(tagHex).toBe('fe4777af26337cebbe1432f95ef91096')
  })

  it('computes the tag for an empty message', async () => {
    const tagHex = await computeTagHex({
      key: hexToBytes('9d6b5c2fa1e84f30d7c6b5a4938f2e1155c0a97e3f6d2c8b41a9de7f05c3b628'),
      segmentA: new Uint8Array(0),
      segmentALength: 0,
      segmentB: new Uint8Array(0),
      segmentBLength: 0,
    })

    expect(tagHex).toBe('55c0a97e3f6d2c8b41a9de7f05c3b628')
  })

  it('computes the tag for whole 16-byte blocks', async () => {
    const tagHex = await computeTagHex({
      key: hexToBytes('9d6b5c2fa1e84f30d7c6b5a4938f2e1155c0a97e3f6d2c8b41a9de7f05c3b628'),
      segmentA: Uint8Array.from({ length: 16 }, () => {
        return 0x7e
      }),
      segmentALength: 16,
      segmentB: Uint8Array.from({ length: 16 }, () => {
        return 0x7e
      }),
      segmentBLength: 16,
    })

    expect(tagHex).toBe('016ef7f67190ab6152eef8f43467ca42')
  })

  it('returns the same tag regardless of how the stream is split into segments', async () => {
    const key = rfc8439Key
    const wholeTag = await computeTagHex({
      key,
      segmentA: rfc8439Message,
      segmentALength: rfc8439Message.length,
      segmentB: new Uint8Array(0),
      segmentBLength: 0,
    })
    const emptyFirstTag = await computeTagHex({
      key,
      segmentA: new Uint8Array(0),
      segmentALength: 0,
      segmentB: rfc8439Message,
      segmentBLength: rfc8439Message.length,
    })

    expect(wholeTag).toBe('071884ead1563aaa18b30f29085ead3b')
    expect(emptyFirstTag).toBe('071884ead1563aaa18b30f29085ead3b')
  })

  it('honors explicit segment lengths over underlying buffer lengths', async () => {
    const tagHex = await computeTagHex({
      key: hexToBytes('9d6b5c2fa1e84f30d7c6b5a4938f2e1155c0a97e3f6d2c8b41a9de7f05c3b628'),
      segmentA: hexToBytes('5acabe31deadbeef'),
      segmentALength: 4,
      segmentB: hexToBytes('0f5542109c8f6fa1b2d4f7'),
      segmentBLength: 11,
    })

    expect(tagHex).toBe('fe4777af26337cebbe1432f95ef91096')
  })

  it('rejects unknown cwrap function names', async () => {
    const wasmLikeModule = await ssh2Poly1305.createModule()

    expect(() => {
      wasmLikeModule.cwrap('poly1305_init', null, [])
    }).toThrow('Unsupported ssh2 poly1305 wasm function: poly1305_init')
  })

  it('matches the ssh2 wasm module output for pseudorandom inputs', async () => {
    const ssh2WasmModule = await createSsh2WasmModule()
    const wasmOutPtr = ssh2WasmModule._malloc(16)
    const wasmPoly1305Auth = ssh2WasmModule.cwrap('poly1305_auth', null, [
      'number',
      'array',
      'number',
      'array',
      'number',
      'array',
    ])
    const deriveBytes = (seed: number, length: number): Uint8Array => {
      return Uint8Array.from({ length }, (_unused, index) => {
        return (seed * 31 + index * 17 + ((seed * index) % 251)) % 256
      })
    }
    const rounds = Array.from({ length: 25 }, (_unused, round) => {
      return round
    })
    const mismatches = rounds.filter((round) => {
      const key = deriveBytes(round, 32)
      const segmentA = deriveBytes(round + 100, (round % 17) + 1)
      const segmentB = deriveBytes(round + 200, ((round * 7) % 33) + 1)
      const jsTagHex = ssh2Poly1305.computeTag({
        key,
        segmentA,
        segmentALength: segmentA.length,
        segmentB,
        segmentBLength: segmentB.length,
      })
      wasmPoly1305Auth(wasmOutPtr, segmentA, segmentA.length, segmentB, segmentB.length, key)

      return bytesToHex(jsTagHex) !== readTagHex(ssh2WasmModule, wasmPoly1305Auth, wasmOutPtr)
    })

    expect(mismatches).toEqual([])
  })
})
