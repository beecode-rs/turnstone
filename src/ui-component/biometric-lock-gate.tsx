import { type JSX, type ReactNode, useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { BiometricAuthService } from '#src/business/service/biometric-auth-service'
import { useBiometricLock } from '#src/ui-component/biometric-lock-context'
import { BiometricLockScreen } from '#src/ui-component/biometric-lock-screen'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

export const BiometricLockGate = (props: { children: ReactNode }): JSX.Element => {
  const { children } = props
  const { isBiometricLockEnabled, isPreferenceLoaded } = useBiometricLock()
  const { md3Theme } = useThemePreference()
  const [isGatePassed, setIsGatePassed] = useState(false)
  const [isAuthInProgress, setIsAuthInProgress] = useState(false)
  const [authFailureMessage, setAuthFailureMessage] = useState<string | null>(null)
  const biometricAuthService = useMemo(() => {
    return new BiometricAuthService()
  }, [])

  const attemptUnlock = async (): Promise<void> => {
    setIsAuthInProgress(true)
    setAuthFailureMessage(null)
    try {
      const isDeviceReady = await biometricAuthService.isDeviceBiometricReady()
      if (!isDeviceReady) {
        setIsGatePassed(true)
        return
      }
      const isAuthenticated = await biometricAuthService.authenticate({ promptMessage: 'Unlock Turnstone' })
      if (isAuthenticated) {
        setIsGatePassed(true)
      } else {
        setAuthFailureMessage('Authentication did not complete. Try again to unlock.')
      }
    } catch {
      setIsGatePassed(true)
    } finally {
      setIsAuthInProgress(false)
    }
  }

  useEffect(() => {
    if (!isPreferenceLoaded || isGatePassed) {
      return
    }
    if (!isBiometricLockEnabled) {
      setIsGatePassed(true)
      return
    }
    void attemptUnlock()
  }, [isPreferenceLoaded, isBiometricLockEnabled, isGatePassed])

  if (!isPreferenceLoaded) {
    return <View style={[styles.cover, { backgroundColor: md3Theme.colors.background }]} />
  }

  if (isGatePassed) {
    return <>{children}</>
  }

  return (
    <BiometricLockScreen
      authFailureMessage={authFailureMessage}
      isAuthInProgress={isAuthInProgress}
      onRetry={() => {
        void attemptUnlock()
      }}
    />
  )
}

const styles = StyleSheet.create({
  cover: {
    flex: 1,
  },
})
