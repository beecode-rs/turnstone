import ReactNativeBlobUtil from 'react-native-blob-util'

export const insecureFetch = {
  isBase64FetchSupported: true,
  isCertificateBypassSupported: true,
  async loadBase64Response(params: {
    isTlsVerificationSkipped: boolean
    url: string
  }): Promise<{ base64: string; status: number }> {
    const { isTlsVerificationSkipped, url } = params
    const response = await ReactNativeBlobUtil.config({ trusty: isTlsVerificationSkipped }).fetch('GET', url)

    return { base64: response.base64() as string, status: response.respInfo.status }
  },
}
