export const insecureFetch = {
  isBase64FetchSupported: false,
  isCertificateBypassSupported: false,
  loadBase64Response(params: { isTlsVerificationSkipped: boolean; url: string }): Promise<{
    base64: string
    status: number
  }> {
    const { url } = params

    return Promise.reject(new Error(`Base64 fetch is not supported on web: ${url}`))
  },
}
