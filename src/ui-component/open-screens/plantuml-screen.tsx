import { type JSX, useEffect, useMemo, useState } from 'react'

import { ViewerModeMapper } from '#src/business/enum/viewer-mode-mapper-enum'
import { GitBranchService } from '#src/business/service/git-branch-service'
import { RemoteExecService } from '#src/business/service/remote-exec-service'
import { serverConnectUseCase } from '#src/business/use-case/server-connect-use-case'
import { AppBottomBar } from '#src/ui-component/app-bottom-bar'
import { CollapsibleTopBar } from '#src/ui-component/collapsible-top-bar'
import { useOpenScreens } from '#src/ui-component/open-screens/open-screens-context'
import { PlantumlView } from '#src/ui-component/plantuml/plantuml-view'
import { remotePathUtil } from '#src/util/remote-path-util'

const gitBranchService = new GitBranchService({ remoteExec: new RemoteExecService() })

const resolveViewToggleIcon = (params: { viewMode: ViewerModeMapper }): string => {
  if (params.viewMode === ViewerModeMapper.RENDERED) {
    return 'code-tags'
  }

  return 'eye'
}

const resolveViewToggleTip = (params: { viewMode: ViewerModeMapper }): string => {
  if (params.viewMode === ViewerModeMapper.RENDERED) {
    return 'View source'
  }

  return 'View rendered'
}

export type PlantumlScreenProps = {
  hostId: string
  path: string
  onPressAbout: () => void
  onPressSettings: () => void
}

export const PlantumlScreen = (props: PlantumlScreenProps): JSX.Element => {
  const { openDrawer } = useOpenScreens()
  const [viewMode, setViewMode] = useState<ViewerModeMapper>(ViewerModeMapper.RENDERED)
  const [branchName, setBranchName] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const fileName = useMemo(() => {
    return remotePathUtil.toParts({ path: props.path }).at(-1) ?? ''
  }, [props.path])

  useEffect(() => {
    const cancelState = { isCancelled: false }
    setBranchName(null)
    void serverConnectUseCase
      .getTransport({ hostId: props.hostId })
      .then((transport) => {
        return gitBranchService.getBranch({
          path: remotePathUtil.toParentDir({ path: props.path }),
          transport,
        })
      })
      .then((nextBranchName) => {
        if (cancelState.isCancelled) {
          return
        }
        setBranchName(nextBranchName)
      })
      .catch(() => {
        return undefined
      })

    return () => {
      cancelState.isCancelled = true
    }
  }, [props.hostId, props.path])

  const handlePressAbout = (): void => {
    props.onPressAbout()
  }

  const handlePressSettings = (): void => {
    props.onPressSettings()
  }

  const handleToggleViewMode = (): void => {
    setViewMode((previous) => {
      if (previous === ViewerModeMapper.RENDERED) {
        return ViewerModeMapper.SOURCE
      }

      return ViewerModeMapper.RENDERED
    })
  }

  const handleRefresh = (): void => {
    setRefreshToken((previous) => {
      return previous + 1
    })
  }

  return (
    <>
      <CollapsibleTopBar
        actions={[
          { icon: 'refresh', key: 'refresh', onPress: handleRefresh, tip: 'Refresh' },
          {
            icon: resolveViewToggleIcon({ viewMode }),
            key: 'toggle-view-mode',
            onPress: handleToggleViewMode,
            tip: resolveViewToggleTip({ viewMode }),
          },
        ]}
        onPressMenu={openDrawer}
        onPressAbout={handlePressAbout}
        onPressSettings={handlePressSettings}
        title={fileName}
      />
      <PlantumlView hostId={props.hostId} path={props.path} refreshToken={refreshToken} viewMode={viewMode} />
      <AppBottomBar branchName={branchName} detailText={fileName} />
    </>
  )
}
