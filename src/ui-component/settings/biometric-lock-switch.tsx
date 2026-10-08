import { type JSX, useMemo, useState } from 'react'
import { Portal, Snackbar, Switch } from 'react-native-paper'

import { BiometricAuthService } from '#src/business/service/biometric-auth-service'
import { useBiometricLock } from '#src/ui-component/biometric-lock-context'

export const BiometricLockSwitch = (): JSX.Element => {
  const { isBiometricLockEnabled, saveIsBiometricLockEnabled } = useBiometricLock()
  const [isDeviceCheckInProgress, setIsDeviceCheckInProgress] = useState(false)
  const [isSetupNotificationVisible, setIsSetupNotificationVisible] = useState(false)
  const biometricAuthService = useMemo(() => {
    return new BiometricAuthService()
  }, [])

  const handleValueChange = async (nextValue: boolean): Promise<void> => {
    if (!nextValue) {
      await saveIsBiometricLockEnabled(false)
      return
    }
    setIsDeviceCheckInProgress(true)
    const isDeviceReady = await biometricAuthService.isDeviceBiometricReady()
    setIsDeviceCheckInProgress(false)
    if (!isDeviceReady) {
      setIsSetupNotificationVisible(true)
      return
    }
    await saveIsBiometricLockEnabled(true)
  }

  return (
    <>
      <Switch
        disabled={isDeviceCheckInProgress}
        onValueChange={(nextValue) => {
          void handleValueChange(nextValue)
        }}
        value={isBiometricLockEnabled}
      />
      <Portal>
        <Snackbar
          onDismiss={() => {
            setIsSetupNotificationVisible(false)
          }}
          visible={isSetupNotificationVisible}
        >
          Biometric lock is not set up on this device. Add a fingerprint or face unlock in the device settings first.
        </Snackbar>
      </Portal>
    </>
  )
}
