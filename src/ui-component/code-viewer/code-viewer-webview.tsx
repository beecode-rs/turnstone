import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono'
import { Asset } from 'expo-asset'
import { File } from 'expo-file-system'
import { type JSX, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'

import highlightBundleSource from '#src/asset/code-viewer/highlight.min.js.txt'
import codeViewerHtmlSource from '#src/asset/code-viewer/index.html'
import themeDarkSource from '#src/asset/code-viewer/theme-dark.css'
import themeLightSource from '#src/asset/code-viewer/theme-light.css'
import { type FontSizePreferenceMapper } from '#src/business/enum/font-size-preference-mapper-enum'
import { type ViewMarginPreferenceMapper } from '#src/business/enum/view-margin-preference-mapper-enum'
import { type ViewerThemeMapper } from '#src/business/enum/viewer-theme-mapper-enum'
import {
  type ViewerMessageIn,
  type ViewerMessageOut,
  type ViewerScrollPositionMessage,
} from '#src/business/model/viewer-message'
import { FONT_SIZE_METRICS } from '#src/ui-component/code-viewer/font-size-metrics'
import { VIEW_MARGIN_METRICS } from '#src/ui-component/code-viewer/view-margin-metrics'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

interface CodeViewerWebviewProps {
  content: string
  fontSize?: FontSizePreferenceMapper
  isLineNumbersHidden?: boolean
  language: string
  margin?: ViewMarginPreferenceMapper
  onContentHeight?: (height: number) => void
  onPullDown?: () => void
  onScrollPosition?: (position: ViewerScrollPositionMessage) => void
  theme: ViewerThemeMapper
  wordWrap?: boolean
}

export type CodeViewerHandle = {
  injectChunk: (params: { text: string }) => void
  replaceContent: (params: { language: string; text: string }) => void
}

export const CodeViewerWebview = forwardRef<CodeViewerHandle, CodeViewerWebviewProps>((props, ref): JSX.Element => {
  const { colors } = useThemePreference().navigationTheme
  const [contentHeight, setContentHeight] = useState(1)
  const [isViewerReady, setIsViewerReady] = useState(false)
  const [viewerHtml, setViewerHtml] = useState<string | null>(null)
  const webViewRef = useRef<WebView>(null)

  const sanitizeInlineScript = (source: string): string => {
    return source.replace(/<\/script/gi, '<\\/script')
  }

  const composeFontFaceCss = (params: { fontBase64: string }): string => {
    return `@font-face{font-family:'JetBrainsMonoViewer';font-style:normal;font-weight:400;src:url(data:font/ttf;base64,${params.fontBase64}) format('truetype')}`
  }

  const composeViewerHtml = (params: {
    fontBase64: string
    highlightBundle: string
    htmlSource: string
    themeDarkCss: string
    themeLightCss: string
  }): string => {
    return params.htmlSource
      .replace('/*__VIEWER_FONT_CSS__*/', () => {
        return composeFontFaceCss({ fontBase64: params.fontBase64 })
      })
      .replace('/*__THEME_DARK__*/', () => {
        return params.themeDarkCss
      })
      .replace('/*__THEME_LIGHT__*/', () => {
        return params.themeLightCss
      })
      .replace('/*__HIGHLIGHT_JS__*/', () => {
        return sanitizeInlineScript(params.highlightBundle)
      })
  }

  const readDownloadedAsset = (params: { asset: Asset }): File => {
    const localUri = params.asset.localUri
    if (!localUri) {
      throw new Error(`Code viewer asset is unavailable locally: ${params.asset.uri}`)
    }

    return new File(localUri)
  }

  const readAssetBase64 = async (params: { assetModule: number }): Promise<string> => {
    const asset = await Asset.fromModule(params.assetModule).downloadAsync()

    return await readDownloadedAsset({ asset }).base64()
  }

  const readAssetText = async (params: { assetModule: number }): Promise<string> => {
    const asset = await Asset.fromModule(params.assetModule).downloadAsync()

    return await readDownloadedAsset({ asset }).text()
  }

  const loadViewerHtml = async (): Promise<string> => {
    const [htmlSource, highlightBundle, themeDarkCss, themeLightCss, fontBase64] = await Promise.all([
      readAssetText({ assetModule: codeViewerHtmlSource }),
      readAssetText({ assetModule: highlightBundleSource }),
      readAssetText({ assetModule: themeDarkSource }),
      readAssetText({ assetModule: themeLightSource }),
      readAssetBase64({ assetModule: JetBrainsMono_400Regular }),
    ])

    return composeViewerHtml({ fontBase64, highlightBundle, htmlSource, themeDarkCss, themeLightCss })
  }

  const sendViewerMessage = (params: { message: ViewerMessageIn }): void => {
    const serializedMessage = JSON.stringify(params.message)
    webViewRef.current?.injectJavaScript(
      `window.__turnstoneViewerReceive && window.__turnstoneViewerReceive(${serializedMessage}); true;`,
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

  const matchViewerMessageFields = (params: { fields: Record<string, unknown> }): ViewerMessageOut | null => {
    switch (params.fields.type) {
      case 'content-height': {
        const height = toFiniteNumber(params.fields.height)
        if (height === null) {
          return null
        }

        return { height, type: 'content-height' }
      }
      case 'pull-down': {
        return { type: 'pull-down' }
      }
      case 'scroll-position': {
        const scrollLeft = toFiniteNumber(params.fields.scrollLeft)
        const scrollWidth = toFiniteNumber(params.fields.scrollWidth)
        const viewportWidth = toFiniteNumber(params.fields.viewportWidth)
        if (scrollLeft === null || scrollWidth === null || viewportWidth === null) {
          return null
        }

        return { scrollLeft, scrollWidth, type: 'scroll-position', viewportWidth }
      }
      default:
        return null
    }
  }

  const parseViewerMessageOut = (raw: string): ViewerMessageOut | null => {
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
        props.onContentHeight?.(message.height)

        return
      }
      case 'pull-down': {
        props.onPullDown?.()

        return
      }
      case 'scroll-position': {
        props.onScrollPosition?.(message)

        return
      }
    }
  }

  const handleLoadEnd = (): void => {
    setIsViewerReady(true)
  }

  useEffect(() => {
    const cancelState = { isCancelled: false }
    void loadViewerHtml()
      .then((html: string) => {
        if (cancelState.isCancelled) {
          return
        }
        setViewerHtml(html)
      })
      .catch(() => {
        return undefined
      })

    return () => {
      cancelState.isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isViewerReady) {
      return
    }
    sendViewerMessage({ message: { content: props.content, language: props.language, type: 'inject-content' } })
  }, [isViewerReady, props.content, props.language])

  useEffect(() => {
    if (!isViewerReady) {
      return
    }
    sendViewerMessage({ message: { theme: props.theme, type: 'set-theme' } })
  }, [isViewerReady, props.theme])

  useEffect(() => {
    if (!isViewerReady || props.isLineNumbersHidden === undefined) {
      return
    }
    sendViewerMessage({ message: { isLineNumbersHidden: props.isLineNumbersHidden, type: 'set-line-numbers' } })
  }, [isViewerReady, props.isLineNumbersHidden])

  useEffect(() => {
    if (!isViewerReady || props.fontSize === undefined) {
      return
    }
    const metrics = FONT_SIZE_METRICS[props.fontSize]
    sendViewerMessage({
      message: {
        fontSizePx: metrics.codeFontSizePx,
        lineHeightPx: metrics.codeLineHeightPx,
        type: 'set-font-size',
      },
    })
  }, [isViewerReady, props.fontSize])

  useEffect(() => {
    if (!isViewerReady || props.margin === undefined) {
      return
    }
    const metrics = VIEW_MARGIN_METRICS[props.margin]
    sendViewerMessage({
      message: {
        paddingHorizontal: metrics.codeHorizontal,
        paddingVertical: metrics.codeVertical,
        type: 'set-margin',
      },
    })
  }, [isViewerReady, props.margin])

  useEffect(() => {
    if (!isViewerReady || props.wordWrap === undefined) {
      return
    }
    sendViewerMessage({ message: { type: 'set-word-wrap', wordWrap: props.wordWrap } })
  }, [isViewerReady, props.wordWrap])

  useImperativeHandle(ref, () => {
    return {
      injectChunk: (params: { text: string }) => {
        sendViewerMessage({ message: { text: params.text, type: 'inject-chunk' } })
      },
      replaceContent: (params: { language: string; text: string }) => {
        sendViewerMessage({ message: { content: params.text, language: params.language, type: 'inject-content' } })
      },
    }
  })

  if (viewerHtml === null) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={String(colors.primary)} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebView
        javaScriptEnabled
        nestedScrollEnabled
        onLoadEnd={handleLoadEnd}
        onMessage={handleViewMessage}
        originWhitelist={['*']}
        overScrollMode="never"
        ref={webViewRef}
        scrollEnabled={false}
        source={{ html: viewerHtml }}
        style={[styles.webview, { height: contentHeight }]}
      />
    </View>
  )
})

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
