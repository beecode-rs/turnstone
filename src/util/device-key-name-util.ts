export const deviceKeyNameUtil = {
  toComment(params: { appName: string; deviceName: string; platform: string }): string {
    const { appName, deviceName, platform } = params

    return `${appName}-beecode@${deviceName}-${platform}`
  },

  toPublicKeyWithComment(params: { comment: string; publicKey: string }): string {
    const { comment, publicKey } = params
    const [keyType, keyData] = publicKey.trim().split(/\s+/)

    return `${keyType} ${keyData} ${comment}`
  },

  toSanitizedName(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
  },
}
