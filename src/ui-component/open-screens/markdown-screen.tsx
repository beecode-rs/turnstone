import { type JSX, useEffect, useMemo, useState } from 'react'

import { ViewerModeMapper } from '#src/business/enum/viewer-mode-mapper-enum'
import { type MarkdownCodeBlock } from '#src/business/model/markdown-code-block'
import { GitBranchService } from '#src/business/service/git-branch-service'
import { markdownBlockSessionService } from '#src/business/service/markdown-block-session-service'
import { RemoteExecService } from '#src/business/service/remote-exec-service'
import { serverConnectUseCase } from '#src/business/use-case/server-connect-use-case'
import { AppBottomBar } from '#src/ui-component/app-bottom-bar'
import { CollapsibleTopBar } from '#src/ui-component/collapsible-top-bar'
import { MarkdownView } from '#src/ui-component/markdown/markdown-view'
import { useOpenScreens } from '#src/ui-component/open-screens/open-screens-context'
import { useRemoteFileText } from '#src/ui-component/use-remote-file-text'
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

export type MarkdownScreenProps = {
  hostId: string
  onCodeBlockPress: (block: MarkdownCodeBlock) => void
  path: string
  onPressAbout: () => void
  onPressSettings: () => void
}

export const MarkdownScreen = (props: MarkdownScreenProps): JSX.Element => {
  const { openDrawer, openFile } = useOpenScreens()
  const [viewMode, setViewMode] = useState<ViewerModeMapper>(ViewerModeMapper.RENDERED)
  const [branchName, setBranchName] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const file = useRemoteFileText({ hostId: props.hostId, path: props.path, refreshToken })
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

  const handleCodeBlockPress = (block: MarkdownCodeBlock): void => {
    markdownBlockSessionService.save({ block, hostId: props.hostId })
    props.onCodeBlockPress(block)
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
      <MarkdownView
        file={file}
        hostId={props.hostId}
        onCodeBlockPress={handleCodeBlockPress}
        onOpenFile={openFile}
        onPullToRefresh={handleRefresh}
        path={props.path}
        viewMode={viewMode}
      />
      <AppBottomBar branchName={branchName} detailText={fileName} />
    </>
  )
}
