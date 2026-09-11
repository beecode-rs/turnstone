export const insecureFetch = {
  isCertificateBypassSupported: false,
  loadBase64(params: { url: string }): Promise<string> {
    const { url } = params

    return Promise.reject(new Error(`Certificate bypass is not supported on web: ${url}`))
  },
}
