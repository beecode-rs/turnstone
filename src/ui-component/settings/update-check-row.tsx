import { type JSX } from 'react'
import { Linking } from 'react-native'
import { Button } from 'react-native-paper'

import { UpdateCheckErrorMapper } from '#src/business/enum/update-check-error-mapper-enum'
import { UpdateCheckStatusMapper } from '#src/business/enum/update-check-status-mapper-enum'
import { type AppReleaseModel } from '#src/business/model/app-release'
import { type UpdateCheckErrorModel } from '#src/business/model/update-check'
import { useAppUpdate } from '#src/ui-component/app-update-context'
import { SettingsRow } from '#src/ui-component/settings/settings-row'

const formatResetTime = (params: { resetAt: number }): string => {
  const { resetAt } = params

  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(resetAt)
}

const getRateLimitDescription = (params: { error: UpdateCheckErrorModel }): string => {
  const { error } = params

  if (error.rateLimitResetAt === undefined) {
    return 'GitHub API rate limit exceeded. Try again later'
  }

  return `GitHub API rate limit exceeded — resets at ${formatResetTime({ resetAt: error.rateLimitResetAt })}`
}

const getUpdateErrorDescription = (params: { error: UpdateCheckErrorModel }): string => {
  const { error } = params
  switch (error.kind) {
    case UpdateCheckErrorMapper.HTTP_ERROR: {
      if (error.httpStatus === 404) {
        return 'No GitHub release published yet for this project'
      }

      return `GitHub request failed with status ${String(error.httpStatus)}`
    }
    case UpdateCheckErrorMapper.INVALID_RESPONSE: {
      return 'GitHub returned an unexpected response'
    }
    case UpdateCheckErrorMapper.NETWORK: {
      return 'Could not reach GitHub. Check your connection and try again'
    }
    case UpdateCheckErrorMapper.RATE_LIMITED: {
      return getRateLimitDescription({ error })
    }
    case UpdateCheckErrorMapper.TIMEOUT: {
      return 'GitHub did not respond in time. Try again'
    }
    default: {
      throw new Error(`Unsupported update check error: ${String(error.kind)}`)
    }
  }
}

const getUpdateStatusDescription = (params: {
  checkStatus: UpdateCheckStatusMapper
  latestRelease: AppReleaseModel | null
  updateCheckError: UpdateCheckErrorModel | null
}): string => {
  const { checkStatus, latestRelease, updateCheckError } = params

  if (checkStatus === UpdateCheckStatusMapper.CHECKING) {
    return 'Checking for updates…'
  }

  if (updateCheckError !== null) {
    return getUpdateErrorDescription({ error: updateCheckError })
  }

  switch (checkStatus) {
    case UpdateCheckStatusMapper.IDLE: {
      return 'Look for a newer release on GitHub'
    }
    case UpdateCheckStatusMapper.UP_TO_DATE: {
      return 'You have the latest version'
    }
    case UpdateCheckStatusMapper.UPDATE_AVAILABLE: {
      return `Version ${latestRelease?.tagName ?? ''} is available`
    }
    default: {
      throw new Error(`Unsupported update check status: ${String(checkStatus)}`)
    }
  }
}

export const UpdateCheckRow = (): JSX.Element => {
  const { checkForUpdates, checkStatus, latestRelease, updateCheckError } = useAppUpdate()

  const handlePressCheck = (): void => {
    void checkForUpdates()
  }

  const handlePressDownload = (): void => {
    if (latestRelease === null) {
      return
    }
    void Linking.openURL(latestRelease.androidApkDownloadUrl ?? latestRelease.htmlUrl)
  }

  const renderControl = (): JSX.Element => {
    if (checkStatus === UpdateCheckStatusMapper.UPDATE_AVAILABLE) {
      return (
        <Button compact mode="contained-tonal" onPress={handlePressDownload}>
          Download
        </Button>
      )
    }

    return (
      <Button
        compact
        disabled={checkStatus === UpdateCheckStatusMapper.CHECKING}
        loading={checkStatus === UpdateCheckStatusMapper.CHECKING}
        mode="contained-tonal"
        onPress={handlePressCheck}
      >
        Check
      </Button>
    )
  }

  return (
    <SettingsRow
      control={renderControl()}
      description={getUpdateStatusDescription({ checkStatus, latestRelease, updateCheckError })}
      label="Check for updates"
    />
  )
}
