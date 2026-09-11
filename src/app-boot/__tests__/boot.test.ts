// Supplements: ../boot.ts
// Covers: boot must neutralize react-native-quick-crypto's globalThis.Buffer swap (its react-native-buffer lacks the node slice/write/species API ssh2 depends on) by restoring the buffer polyfill as the global and patching both constructors - module-load side effects against a mocked native module cannot be expressed in contract.yaml

import { Buffer } from 'buffer'
import { afterEach, describe, expect, it, vi } from 'vitest'

type PatchableBufferConstructor = {
  prototype: PatchableBufferPrototype
  [Symbol.species]?: unknown
}

type PatchableBufferPrototype = {
  utf8Slice?: unknown
  utf8Write?: unknown
}

function quickCryptoBufferStub() {
  return undefined
}

const quickCryptoBufferCtor = quickCryptoBufferStub as unknown as typeof Buffer

const quickCryptoInstallCalls: PatchableBufferConstructor[] = []

vi.mock('react-native-quick-crypto', () => {
  return {
    install: () => {
      globalThis.Buffer = quickCryptoBufferCtor
      quickCryptoInstallCalls.push(quickCryptoBufferCtor as PatchableBufferConstructor)
    },
  }
})

vi.mock('expo-font', () => {
  return {
    loadAsync: async () => {
      return undefined
    },
  }
})

vi.mock('@expo-google-fonts/inter', () => {
  return {
    Inter_400Regular: {},
    Inter_400Regular_Italic: {},
    Inter_700Bold: {},
  }
})

vi.mock('@expo-google-fonts/jetbrains-mono', () => {
  return {
    JetBrainsMono_400Regular: {},
    JetBrainsMono_400Regular_Italic: {},
    JetBrainsMono_700Bold: {},
  }
})

describe('appBoot node buffer unification', () => {
  afterEach(() => {
    globalThis.Buffer = Buffer
  })

  it('restores the buffer polyfill as the global Buffer after quick-crypto swaps it', async () => {
    await import('#src/app-boot/boot')

    expect(quickCryptoInstallCalls).toHaveLength(1)
    expect(globalThis.Buffer).toBe(Buffer)
  })

  it('installs the node buffer patches on both constructors', async () => {
    await import('#src/app-boot/boot')

    const speciesBuffer = Buffer as PatchableBufferConstructor
    const speciesQuickCrypto = quickCryptoBufferCtor as PatchableBufferConstructor
    const bufferPrototype = Buffer.prototype as unknown as PatchableBufferPrototype
    const quickCryptoPrototype = quickCryptoBufferCtor.prototype as unknown as PatchableBufferPrototype
    expect(speciesBuffer[Symbol.species]).toBeDefined()
    expect(speciesQuickCrypto[Symbol.species]).toBe(quickCryptoBufferCtor)
    expect(typeof bufferPrototype.utf8Slice).toBe('function')
    expect(typeof bufferPrototype.utf8Write).toBe('function')
    expect(typeof quickCryptoPrototype.utf8Slice).toBe('function')
    expect(typeof quickCryptoPrototype.utf8Write).toBe('function')
  })
})
