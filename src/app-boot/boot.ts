import { Inter_400Regular, Inter_400Regular_Italic, Inter_700Bold } from '@expo-google-fonts/inter'
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_400Regular_Italic,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono'
import { Buffer } from 'buffer'
import * as Font from 'expo-font'
import process from 'process'
import { TextDecoder as polyfillTextDecoder, TextEncoder as polyfillTextEncoder } from 'text-encoding-polyfill'

import { installCrypto } from '#src/app-boot/install-crypto'
import { installNodeBufferSliceMethods } from '#src/app-boot/install-node-buffer-slice-methods'
import { installNodeBufferSpecies } from '#src/app-boot/install-node-buffer-species'
import { installNodeBufferWriteMethods } from '#src/app-boot/install-node-buffer-write-methods'

const runtimeGlobals = globalThis as {
  TextDecoder?: typeof globalThis.TextDecoder
  TextEncoder?: typeof globalThis.TextEncoder
}

globalThis.Buffer = Buffer
globalThis.process = process

runtimeGlobals.TextDecoder ??= polyfillTextDecoder
runtimeGlobals.TextEncoder ??= polyfillTextEncoder

installCrypto.install()
const quickCryptoBuffer = (globalThis as { Buffer?: typeof Buffer }).Buffer
globalThis.Buffer = Buffer
installNodeBufferSliceMethods.install(Buffer)
installNodeBufferSpecies.install(Buffer)
installNodeBufferWriteMethods.install(Buffer)
if (quickCryptoBuffer !== undefined && quickCryptoBuffer !== Buffer) {
  installNodeBufferSliceMethods.install(quickCryptoBuffer)
  installNodeBufferSpecies.install(quickCryptoBuffer)
  installNodeBufferWriteMethods.install(quickCryptoBuffer)
}

export const appBoot = {
  async loadFonts(): Promise<void> {
    await Font.loadAsync({
      interBold: Inter_700Bold,
      interItalic: Inter_400Regular_Italic,
      interRegular: Inter_400Regular,
      jetBrainsMonoBold: JetBrainsMono_700Bold,
      jetBrainsMonoItalic: JetBrainsMono_400Regular_Italic,
      jetBrainsMonoRegular: JetBrainsMono_400Regular,
    })
  },
}
