// Supplements: ../install-node-buffer-species.contract.yaml
// Covers: Buffer[Symbol.species] must become a constructor accepting (arrayBuffer, byteOffset, length) — post-install object state that contract.yaml cannot observe

import { Buffer } from 'buffer/'
import { describe, expect, it } from 'vitest'

import { installNodeBufferSpecies } from '#src/app-boot/install-node-buffer-species'

type PolyfillBufferConstructor = typeof Buffer & {
  [Symbol.species]: new (buffer: ArrayBuffer, byteOffset: number, length: number) => Uint8Array
}

type PatchableSpeciesConstructor = {
  prototype: unknown
  [Symbol.species]?: unknown
}

const polyfillBuffer = Buffer as PolyfillBufferConstructor

describe('installNodeBufferSpecies', () => {
  it('exposes the polyfill Buffer as Symbol.species constructor for zero-copy payload views', () => {
    installNodeBufferSpecies.install(polyfillBuffer)

    expect(polyfillBuffer[Symbol.species]).toBe(polyfillBuffer)

    const packet = Buffer.from([2, 11, 22, 33, 9, 9])
    const payload = new polyfillBuffer[Symbol.species](
      packet.buffer,
      packet.byteOffset + 1,
      packet.length - packet[0] - 1,
    )
    expect(payload.length).toBe(3)
    expect(Array.from(payload)).toEqual([11, 22, 33])
  })

  it('keeps an existing Symbol.species untouched', () => {
    class SpeciesHost extends Uint8Array {}
    const speciesHost: PatchableSpeciesConstructor = SpeciesHost

    installNodeBufferSpecies.install(speciesHost)

    expect(speciesHost[Symbol.species]).toBe(SpeciesHost)
    expect(Object.getOwnPropertyDescriptor(SpeciesHost, Symbol.species)).toBeUndefined()
  })
})
