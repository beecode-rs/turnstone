import { type JSX, useEffect, useMemo, useRef, useState } from 'react'
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
import { HtmlPreviewWebview } from '#src/ui-component/html/html-preview-webview'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { useRemoteFileText } from '#src/ui-component/use-remote-file-text'
import { remotePathUtil } from '#src/util/remote-path-util'

const PULL_DOWN_TOP_OFFSET_MAX_PX = 1

interface HtmlViewProps {
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

export const HtmlView = (props: HtmlViewProps): JSX.Element => {
  const { effectiveScheme, navigationTheme } = useThemePreference()
  const { isLineNumbersHidden } = useLineNumbers()
  const { isWordWrapEnabled } = useWordWrap()
  const { fontSize } = useFontSize()
  const { margin } = useViewMargin()
  const { colors } = navigationTheme
  const [isRefreshing, setIsRefreshing] = useState(false)
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
  const isBinary = binarySize !== null

  useEffect(() => {
    if (!isLoading) {
      setIsRefreshing(false)
    }
  }, [isLoading])

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

  if (isLoading && text === '' && binarySize === null) {
    return (
      <CutoutSafeArea style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={String(colors.primary)} />
        </View>
      </CutoutSafeArea>
    )
  }

  if (isBinary) {
    return (
      <CutoutSafeArea style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          refreshControl={
            <RefreshControl
              colors={[String(colors.primary)]}
              onRefresh={handlePullToRefresh}
              refreshing={isRefreshing}
              tintColor={colors.primary}
            />
          }
          scrollEventThrottle={200}
          style={styles.scroll}
        >
          <BinaryPlaceholder fileName={fileName} size={binarySize} />
        </ScrollView>
      </CutoutSafeArea>
    )
  }

  if (props.viewMode === ViewerModeMapper.SOURCE) {
    return (
      <CutoutSafeArea style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          refreshControl={
            <RefreshControl
              colors={[String(colors.primary)]}
              onRefresh={handlePullToRefresh}
              refreshing={isRefreshing}
              tintColor={colors.primary}
            />
          }
          scrollEventThrottle={200}
          style={styles.scroll}
        >
          <CodeViewerWebview
            content={text}
            fontSize={fontSize}
            isLineNumbersHidden={isLineNumbersHidden}
            language="xml"
            margin={margin}
            onPullDown={handleViewerPullDown}
            theme={viewerTheme}
            wordWrap={isWordWrapEnabled}
          />
          {isTruncated && (
            <Text style={[styles.truncatedNote, { color: colors.text }]}>Large HTML file: showing the first 2 MB</Text>
          )}
        </ScrollView>
      </CutoutSafeArea>
    )
  }

  return (
    <CutoutSafeArea style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.previewContainer}>
        <HtmlPreviewWebview html={text} />
      </View>
      {isTruncated && (
        <Text style={[styles.truncatedNote, { color: colors.text }]}>Large HTML file: showing the first 2 MB</Text>
      )}
    </CutoutSafeArea>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  previewContainer: {
    flex: 1,
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
