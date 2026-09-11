import { Asset } from 'expo-asset'
import { File } from 'expo-file-system'

export class WebviewAssets {
  async readAssetBase64(params: { assetModule: number | string }): Promise<string> {
    const { assetModule } = params
    const asset = await Asset.fromModule(assetModule).downloadAsync()

    return await this._toDownloadedAssetFile({ asset }).base64()
  }

  async readAssetText(params: { assetModule: number | string }): Promise<string> {
    const { assetModule } = params
    const asset = await Asset.fromModule(assetModule).downloadAsync()

    return await this._toDownloadedAssetFile({ asset }).text()
  }

  protected _toDownloadedAssetFile(params: { asset: Asset }): File {
    const { asset } = params
    const localUri = asset.localUri
    if (!localUri) {
      throw new Error(`Webview asset is unavailable locally: ${asset.uri}`)
    }

    return new File(localUri)
  }
}
