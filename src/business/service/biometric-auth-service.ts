export class BiometricAuthService {
  async isDeviceBiometricReady(): Promise<boolean> {
    try {
      const localAuthentication = await import('expo-local-authentication')
      const [hasHardware, isEnrolled] = await Promise.all([
        localAuthentication.hasHardwareAsync(),
        localAuthentication.isEnrolledAsync(),
      ])

      return hasHardware && isEnrolled
    } catch {
      return false
    }
  }

  async authenticate(params: { promptMessage: string }): Promise<boolean> {
    const { promptMessage } = params
    try {
      const localAuthentication = await import('expo-local-authentication')
      const result = await localAuthentication.authenticateAsync({ promptMessage })

      return result.success
    } catch {
      return false
    }
  }
}
