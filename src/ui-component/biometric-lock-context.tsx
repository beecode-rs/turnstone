import { type JSX, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'

import { BiometricLockPreferenceService } from '#src/business/service/biometric-lock-preference-service'
import { biometricLockPreferenceStorage } from '#src/lib/async-storage'

interface BiometricLockContextValue {
  isBiometricLockEnabled: boolean
  isPreferenceLoaded: boolean
  saveIsBiometricLockEnabled: (nextIsBiometricLockEnabled: boolean) => Promise<void>
}

const BiometricLockContext = createContext<BiometricLockContextValue | undefined>(undefined)

export const BiometricLockProvider = (props: { children: ReactNode }): JSX.Element => {
  const [isBiometricLockEnabled, setIsBiometricLockEnabled] = useState(false)
  const [isPreferenceLoaded, setIsPreferenceLoaded] = useState(false)
  const biometricLockPreferenceService = useMemo(() => {
    return new BiometricLockPreferenceService()
  }, [])

  useEffect(() => {
    void biometricLockPreferenceService
      .loadPreference({ storage: biometricLockPreferenceStorage })
      .then((loadedIsBiometricLockEnabled) => {
        setIsBiometricLockEnabled(loadedIsBiometricLockEnabled)
      })
      .catch(() => {
        setIsBiometricLockEnabled(false)
      })
      .finally(() => {
        setIsPreferenceLoaded(true)
      })
  }, [biometricLockPreferenceService])

  const contextValue = useMemo(() => {
    return {
      isBiometricLockEnabled,
      isPreferenceLoaded,
      saveIsBiometricLockEnabled: (nextIsBiometricLockEnabled: boolean) => {
        return biometricLockPreferenceService
          .savePreference({
            isBiometricLockEnabled: nextIsBiometricLockEnabled,
            storage: biometricLockPreferenceStorage,
          })
          .then(() => {
            setIsBiometricLockEnabled(nextIsBiometricLockEnabled)
          })
      },
    }
  }, [biometricLockPreferenceService, isBiometricLockEnabled, isPreferenceLoaded])

  return <BiometricLockContext.Provider value={contextValue}>{props.children}</BiometricLockContext.Provider>
}

export const useBiometricLock = (): BiometricLockContextValue => {
  const contextValue = useContext(BiometricLockContext)

  if (!contextValue) {
    throw new Error('useBiometricLock requires BiometricLockProvider')
  }

  return contextValue
}
