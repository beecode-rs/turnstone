import { type JSX, type ReactElement, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { EffectiveThemeSchemeMapper } from '#src/business/enum/effective-theme-scheme-mapper-enum'
import { ViewerModeMapper } from '#src/business/enum/viewer-mode-mapper-enum'
import { ViewerThemeMapper } from '#src/business/enum/viewer-theme-mapper-enum'
import { BinaryPlaceholder } from '#src/ui-component/code-viewer/binary-placeholder'
import { CodeViewerWebview } from '#src/ui-component/code-viewer/code-viewer-webview'
import { useFontSize } from '#src/ui-component/code-viewer/font-size-context'
import { useLineNumbers } from '#src/ui-component/code-viewer/line-numbers-context'
import { useViewMargin } from '#src/ui-component/code-viewer/view-margin-context'
import { useWordWrap } from '#src/ui-component/code-viewer/word-wrap-context'
import { CutoutSafeArea } from '#src/ui-component/cutout-safe-area'
import { ImagePreview } from '#src/ui-component/file-preview/image-preview'
import {
  type PlantumlDiagramResult,
  usePlantumlDiagramSource,
} from '#src/ui-component/plantuml/use-plantuml-diagram-source'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { useRemoteFileText } from '#src/ui-component/use-remote-file-text'
import { remotePathUtil } from '#src/util/remote-path-util'

const PULL_DOWN_TOP_OFFSET_MAX_PX = 1

interface PlantumlViewProps {
  hostId: string
  path: string
  refreshToken?: number
  viewMode: ViewerModeMapper
}

const resolveFileName = (params: { path: string }): string => {
  return remotePathUtil.toParts({ path: params.path }).at(-1) ?? ''
}

const resolveViewerTheme = (params: { scheme: EffectiveThemeSchemeMapper }): ViewerThemeMapper => {
  if (params.scheme === EffectiveThemeSchemeMapper.DARK) {
    return ViewerThemeMapper.DARK
  }

  return ViewerThemeMapper.LIGHT
}

const resolveDiagramNotice = (params: {
  isImageLoadFailed: boolean
  result: PlantumlDiagramResult
}): string | undefined => {
  const { isImageLoadFailed, result } = params
  switch (result.kind) {
    case 'image': {
      if (isImageLoadFailed) {
        return 'Could not render the diagram.'
      }

      return undefined
    }
    case 'invalid-source': {
      return 'The PlantUML source contains errors.'
    }
    case 'server-error': {
      return 'The PlantUML server returned an error. Check the server URL in settings.'
    }
    case 'unreachable': {
      return 'Could not reach the PlantUML server. Check the server URL in settings.'
    }
    default: {
      return undefined
    }
  }
}

const resolveDiagramImageSource = (params: {
  isImageLoadFailed: boolean
  result: PlantumlDiagramResult
}): string | undefined => {
  const { isImageLoadFailed, result } = params
  switch (result.kind) {
    case 'image': {
      if (isImageLoadFailed) {
        return undefined
      }

      return result.source
    }
    case 'invalid-source': {
      if (isImageLoadFailed) {
        return undefined
      }

      return result.source
    }
    default: {
      return undefined
    }
  }
}

export const PlantumlView = (props: PlantumlViewProps): JSX.Element => {
  const { effectiveScheme, navigationTheme } = useThemePreference()
  const { isLineNumbersHidden } = useLineNumbers()
  const { isWordWrapEnabled } = useWordWrap()
  const { fontSize } = useFontSize()
  const { margin } = useViewMargin()
  const { colors } = navigationTheme
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isImageLoadFailed, setIsImageLoadFailed] = useState(false)
  const [isDiagramZoomed, setIsDiagramZoomed] = useState(false)
  const [localRefreshToken, setLocalRefreshToken] = useState(0)
  const scrollOffsetRef = useRef(0)
  const { binarySize, isLoading, isTruncated, text } = useRemoteFileText({
    hostId: props.hostId,
    path: props.path,
    refreshToken: (props.refreshToken ?? 0) + localRefreshToken,
  })

  const fileName = useMemo(() => {
    return resolveFileName({ path: props.path })
  }, [props.path])
  const viewerTheme = useMemo(() => {
    return resolveViewerTheme({ scheme: effectiveScheme })
  }, [effectiveScheme])
  const { result: diagramResult } = usePlantumlDiagramSource({ source: text })

  useEffect(() => {
    if (!isLoading) {
      setIsRefreshing(false)
    }
  }, [isLoading])

  useEffect(() => {
    setIsImageLoadFailed(false)
  }, [diagramResult])

  const isBinary = binarySize !== null
  const fileText = text
  const diagramNotice = resolveDiagramNotice({ isImageLoadFailed, result: diagramResult })
  const diagramImageSource = resolveDiagramImageSource({ isImageLoadFailed, result: diagramResult })
  const isPullToRefreshEnabled = isBinary || props.viewMode === ViewerModeMapper.SOURCE

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y
  }

  const handlePullToRefresh = (): void => {
    setIsRefreshing(true)
    setLocalRefreshToken((previous) => {
      return previous + 1
    })
  }

  const handleViewerPullDown = (): void => {
    if (scrollOffsetRef.current > PULL_DOWN_TOP_OFFSET_MAX_PX) {
      return
    }
    handlePullToRefresh()
  }

  const renderRefreshControl = (): ReactElement | undefined => {
    if (!isPullToRefreshEnabled) {
      return undefined
    }

    return (
      <RefreshControl
        colors={[String(colors.primary)]}
        onRefresh={handlePullToRefresh}
        refreshing={isRefreshing}
        tintColor={colors.primary}
      />
    )
  }

  if (isLoading && text === '' && binarySize === null) {
    return (
      <CutoutSafeArea style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={String(colors.primary)} />
        </View>
      </CutoutSafeArea>
    )
  }

  return (
    <CutoutSafeArea style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        refreshControl={renderRefreshControl()}
        scrollEnabled={!isDiagramZoomed}
        scrollEventThrottle={200}
        style={styles.scroll}
      >
        {isBinary && <BinaryPlaceholder fileName={fileName} size={binarySize} />}
        {!isBinary && props.viewMode === ViewerModeMapper.RENDERED && diagramResult.kind === 'pending' && (
          <View style={styles.renderLoading}>
            <ActivityIndicator color={String(colors.primary)} />
          </View>
        )}
        {!isBinary && props.viewMode === ViewerModeMapper.RENDERED && diagramNotice !== undefined && (
          <Text style={[styles.renderError, { color: colors.text }]}>{diagramNotice}</Text>
        )}
        {!isBinary && props.viewMode === ViewerModeMapper.RENDERED && diagramImageSource !== undefined && (
          <ImagePreview
            isExpandable
            onError={() => {
              setIsImageLoadFailed(true)
            }}
            onZoomChange={setIsDiagramZoomed}
            uri={diagramImageSource}
          />
        )}
        {!isBinary && props.viewMode === ViewerModeMapper.SOURCE && (
          <CodeViewerWebview
            content={fileText}
            fontSize={fontSize}
            isLineNumbersHidden={isLineNumbersHidden}
            language="plaintext"
            margin={margin}
            onPullDown={handleViewerPullDown}
            theme={viewerTheme}
            wordWrap={isWordWrapEnabled}
          />
        )}
        {!isBinary && isTruncated && (
          <Text style={[styles.truncatedNote, { color: colors.text }]}>
            Large PlantUML file: showing the first 2 MB
          </Text>
        )}
      </ScrollView>
    </CutoutSafeArea>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  renderError: {
    fontSize: 12,
    opacity: 0.6,
    padding: 16,
    textAlign: 'center',
  },
  renderLoading: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  truncatedNote: {
    fontSize: 12,
    opacity: 0.6,
    padding: 16,
  },
})
