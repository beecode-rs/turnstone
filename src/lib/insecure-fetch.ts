import ReactNativeBlobUtil from 'react-native-blob-util'

export const insecureFetch = {
  isCertificateBypassSupported: true,
  async loadBase64(params: { url: string }): Promise<string> {
    const { url } = params
    const response = await ReactNativeBlobUtil.config({ trusty: true }).fetch('GET', url)
    const status = response.respInfo.status
    if (status < 200 || status >= 300) {
      throw new Error(`Insecure fetch failed with status ${String(status)}: ${url}`)
    }

    return response.base64() as string
  },
}
