import Constants from 'expo-constants'
import { type JSX, type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { UpdateCheckStatusMapper } from '#src/business/enum/update-check-status-mapper-enum'
import { type AppReleaseModel } from '#src/business/model/app-release'
import { type UpdateCheckErrorModel } from '#src/business/model/update-check'
import { AppReleaseService } from '#src/business/service/app-release-service'

interface AppUpdateContextValue {
  checkForUpdates: (params?: { isSilent?: boolean }) => Promise<void>
  checkStatus: UpdateCheckStatusMapper
  latestRelease: AppReleaseModel | null
  updateCheckError: UpdateCheckErrorModel | null
}

const AppUpdateContext = createContext<AppUpdateContextValue | undefined>(undefined)

export const AppUpdateProvider = (props: { children: ReactNode }): JSX.Element => {
  const [checkStatus, setCheckStatus] = useState<UpdateCheckStatusMapper>(UpdateCheckStatusMapper.IDLE)
  const [latestRelease, setLatestRelease] = useState<AppReleaseModel | null>(null)
  const [updateCheckError, setUpdateCheckError] = useState<UpdateCheckErrorModel | null>(null)
  const appReleaseService = useMemo(() => {
    return new AppReleaseService()
  }, [])
  const currentVersion = Constants.expoConfig?.version ?? 'unknown'

  const checkForUpdates = useCallback(
    async (params: { isSilent?: boolean } = {}): Promise<void> => {
      const { isSilent } = params
      setCheckStatus(UpdateCheckStatusMapper.CHECKING)
      const result = await appReleaseService.findLatestRelease()
      if (result.error !== undefined) {
        setCheckStatus(UpdateCheckStatusMapper.IDLE)
        if (isSilent) {
          console.warn('[app-update] automatic update check failed:', result.error)

          return
        }
        console.error('[app-update] update check failed:', result.error)
        setUpdateCheckError(result.error)

        return
      }
      setUpdateCheckError(null)
      setLatestRelease(result.release)
      setCheckStatus(appReleaseService.resolveStatus({ currentVersion, release: result.release }))
    },
    [appReleaseService, currentVersion],
  )

  useEffect(() => {
    void checkForUpdates({ isSilent: true })
  }, [checkForUpdates])

  const contextValue = useMemo(() => {
    return { checkForUpdates, checkStatus, latestRelease, updateCheckError }
  }, [checkForUpdates, checkStatus, latestRelease, updateCheckError])

  return <AppUpdateContext.Provider value={contextValue}>{props.children}</AppUpdateContext.Provider>
}

export const useAppUpdate = (): AppUpdateContextValue => {
  const contextValue = useContext(AppUpdateContext)

  if (!contextValue) {
    throw new Error('useAppUpdate requires AppUpdateProvider')
  }

  return contextValue
}
