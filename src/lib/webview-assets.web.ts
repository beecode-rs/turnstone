import { Asset } from 'expo-asset'

import { constant } from '#src/util/constant'

export class WebviewAssets {
  async readAssetBase64(params: { assetModule: number | string }): Promise<string> {
    const { assetModule } = params
    const asset = await Asset.fromModule(assetModule).downloadAsync()
    const response = await fetch(this._toDownloadedAssetUrl({ asset }))
    const bytes = new Uint8Array(await response.arrayBuffer())

    return this._toBase64({ bytes })
  }

  async readAssetText(params: { assetModule: number | string }): Promise<string> {
    const { assetModule } = params
    const asset = await Asset.fromModule(assetModule).downloadAsync()
    const response = await fetch(this._toDownloadedAssetUrl({ asset }))

    return await response.text()
  }

  protected _toBase64(params: { bytes: Uint8Array }): string {
    const { bytes } = params
    const chunkCount = Math.ceil(bytes.length / constant.webview.base64ChunkBytes)
    const chunkTexts = Array.from({ length: chunkCount }, (_chunkIndex, chunkNumber) => {
      const chunkStart = chunkNumber * constant.webview.base64ChunkBytes
      const chunkEnd = Math.min(chunkStart + constant.webview.base64ChunkBytes, bytes.length)

      return String.fromCharCode(...bytes.slice(chunkStart, chunkEnd))
    })

    return btoa(chunkTexts.join(''))
  }

  protected _toDownloadedAssetUrl(params: { asset: Asset }): string {
    const { asset } = params
    const localUri = asset.localUri
    if (!localUri) {
      throw new Error(`Webview asset is unavailable locally: ${asset.uri}`)
    }

    return localUri
  }
}
