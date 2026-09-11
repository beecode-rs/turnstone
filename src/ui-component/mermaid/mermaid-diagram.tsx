import { type JSX, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'

import { EffectiveThemeSchemeMapper } from '#src/business/enum/effective-theme-scheme-mapper-enum'
import { ViewerThemeMapper } from '#src/business/enum/viewer-theme-mapper-enum'
import { type MermaidViewerMessageIn, type MermaidViewerMessageOut } from '#src/business/model/mermaid-viewer-message'
import { mermaidHtml } from '#src/ui-component/mermaid/mermaid-html'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

interface MermaidDiagramProps {
  onError?: () => void
  source: string
}

const resolveViewerTheme = (params: { scheme: EffectiveThemeSchemeMapper }): ViewerThemeMapper => {
  if (params.scheme === EffectiveThemeSchemeMapper.DARK) {
    return ViewerThemeMapper.DARK
  }

  return ViewerThemeMapper.LIGHT
}

const isInitialDocumentUrl = (params: { url: string }): boolean => {
  if (params.url === 'about:blank' || params.url.startsWith('about:blank#')) {
    return true
  }

  return false
}

export const MermaidDiagram = (props: MermaidDiagramProps): JSX.Element => {
  const { effectiveScheme, navigationTheme } = useThemePreference()
  const [contentHeight, setContentHeight] = useState(1)
  const [isViewerReady, setIsViewerReady] = useState(false)
  const [viewerHtml, setViewerHtml] = useState<string | null>(null)
  const webViewRef = useRef<WebView>(null)
  const viewerTheme = useMemo(() => {
    return resolveViewerTheme({ scheme: effectiveScheme })
  }, [effectiveScheme])

  const sendViewerMessage = (params: { message: MermaidViewerMessageIn }): void => {
    const serializedMessage = JSON.stringify(params.message)
    webViewRef.current?.injectJavaScript(
      `window.__turnstoneMermaidReceive && window.__turnstoneMermaidReceive(${serializedMessage}); true;`,
    )
  }

  const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null
  }

  const toFiniteNumber = (value: unknown): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null
    }

    return value
  }

  const matchViewerMessageFields = (params: { fields: Record<string, unknown> }): MermaidViewerMessageOut | null => {
    switch (params.fields.type) {
      case 'content-height': {
        const height = toFiniteNumber(params.fields.height)
        if (height === null) {
          return null
        }

        return { height, type: 'content-height' }
      }
      case 'error': {
        if (typeof params.fields.message !== 'string') {
          return null
        }

        return { message: params.fields.message, type: 'error' }
      }
      default:
        return null
    }
  }

  const parseViewerMessageOut = (raw: string): MermaidViewerMessageOut | null => {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) {
      return null
    }

    return matchViewerMessageFields({ fields: parsed })
  }

  const handleViewMessage = (event: WebViewMessageEvent): void => {
    const message = parseViewerMessageOut(event.nativeEvent.data)
    if (message === null) {
      return
    }
    switch (message.type) {
      case 'content-height': {
        setContentHeight(message.height)

        return
      }
      case 'error': {
        props.onError?.()

        return
      }
    }
  }

  const handleLoadEnd = (): void => {
    setIsViewerReady(true)
  }

  useEffect(() => {
    const cancelState = { isCancelled: false }
    void mermaidHtml
      .load()
      .then((html: string) => {
        if (cancelState.isCancelled) {
          return
        }
        setViewerHtml(html)
      })
      .catch(() => {
        props.onError?.()
      })

    return () => {
      cancelState.isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isViewerReady) {
      return
    }
    sendViewerMessage({ message: { source: props.source, theme: viewerTheme, type: 'render' } })
  }, [isViewerReady, props.source, viewerTheme])

  if (viewerHtml === null) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: navigationTheme.colors.background }]}>
        <ActivityIndicator color={String(navigationTheme.colors.primary)} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: navigationTheme.colors.background }]}>
      <WebView
        javaScriptEnabled
        nestedScrollEnabled
        onLoadEnd={handleLoadEnd}
        onMessage={handleViewMessage}
        onShouldStartLoadWithRequest={(request) => {
          return isInitialDocumentUrl({ url: request.url })
        }}
        originWhitelist={['*']}
        overScrollMode="never"
        ref={webViewRef}
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        source={{ html: viewerHtml }}
        style={[styles.webview, { height: contentHeight }]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  webview: {
    backgroundColor: 'transparent',
  },
})
