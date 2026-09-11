import { type JSX, useEffect, useMemo, useRef, useState } from 'react'

import { BinaryPreviewKindMapper } from '#src/business/enum/binary-preview-kind-mapper-enum'
import { GitBranchService } from '#src/business/service/git-branch-service'
import { RemoteExecService } from '#src/business/service/remote-exec-service'
import { serverConnectUseCase } from '#src/business/use-case/server-connect-use-case'
import { AppBottomBar } from '#src/ui-component/app-bottom-bar'
import { type AppTopBarAction } from '#src/ui-component/app-top-bar'
import { FileViewer, type FileViewerHandle } from '#src/ui-component/code-viewer/file-viewer'
import { CollapsibleTopBar } from '#src/ui-component/collapsible-top-bar'
import { useOpenScreens } from '#src/ui-component/open-screens/open-screens-context'
import { binaryPreviewUtil } from '#src/util/binary-preview-util'
import { languageUtil } from '#src/util/language-util'
import { remotePathUtil } from '#src/util/remote-path-util'

const gitBranchService = new GitBranchService({ remoteExec: new RemoteExecService() })

export type FileScreenProps = {
  hostId: string
  isActive: boolean
  isDiffAvailable: boolean
  onPressAbout: () => void
  onPressSettings: () => void
  onViewDiff: (params: { path: string }) => void
  path: string
}

export const FileScreen = (props: FileScreenProps): JSX.Element => {
  const { openDrawer } = useOpenScreens()
  const viewerRef = useRef<FileViewerHandle>(null)
  const [branchName, setBranchName] = useState<string | null>(null)
  const [isCodeViewForced, setIsCodeViewForced] = useState(false)
  const fileName = useMemo(() => {
    return remotePathUtil.toParts({ path: props.path }).at(-1) ?? ''
  }, [props.path])
  const language = useMemo(() => {
    return languageUtil.detectLanguage({ fileName })
  }, [fileName])
  const previewKind = useMemo(() => {
    return binaryPreviewUtil.classify({ fileName })
  }, [fileName])

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

  const handleReloadFile = (): void => {
    viewerRef.current?.reload()
  }

  const handleShowCodeView = (): void => {
    setIsCodeViewForced(true)
  }

  const handleShowVisualPreview = (): void => {
    setIsCodeViewForced(false)
  }

  const handleViewDiff = (): void => {
    props.onViewDiff({ path: props.path })
  }

  const isViewerFocused = (): boolean => {
    return props.isActive
  }

  const toDiffActions = (): AppTopBarAction[] => {
    if (!props.isDiffAvailable) {
      return []
    }

    return [{ icon: 'file-compare', key: 'view-diff', onPress: handleViewDiff, tip: 'View git diff' }]
  }

  const topBarActions = useMemo(() => {
    const diffActions = toDiffActions()
    const reloadAction = { icon: 'refresh', key: 'reload', onPress: handleReloadFile, tip: 'Reload file' }
    if (previewKind !== BinaryPreviewKindMapper.SVG) {
      return [...diffActions, reloadAction]
    }
    if (isCodeViewForced) {
      return [
        ...diffActions,
        { icon: 'image', key: 'svg-visual', onPress: handleShowVisualPreview, tip: 'Show visual preview' },
        reloadAction,
      ]
    }

    return [
      ...diffActions,
      { icon: 'code-tags', key: 'svg-code', onPress: handleShowCodeView, tip: 'Show SVG source' },
      reloadAction,
    ]
  }, [isCodeViewForced, previewKind, props.isDiffAvailable])

  return (
    <>
      <CollapsibleTopBar
        actions={topBarActions}
        onPressMenu={openDrawer}
        onPressAbout={handlePressAbout}
        onPressSettings={handlePressSettings}
        title={fileName}
      />
      <FileViewer
        hostId={props.hostId}
        isCodeViewForced={isCodeViewForced}
        isFocused={isViewerFocused}
        language={language}
        path={props.path}
        ref={viewerRef}
      />
      <AppBottomBar branchName={branchName} detailText={fileName} />
    </>
  )
}
