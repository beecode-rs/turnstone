import { type JSX, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'

import { type ViewerThemeMapper } from '#src/business/enum/viewer-theme-mapper-enum'
import { type PdfViewerMessageIn, type PdfViewerMessageOut } from '#src/business/model/pdf-viewer-message'
import { pdfViewerHtml } from '#src/ui-component/file-preview/pdf-viewer-html'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

interface PdfViewerWebviewProps {
  onContentHeight?: (height: number) => void
  onDocumentMeta?: (pageCount: number) => void
  onError?: (message: string) => void
  theme: ViewerThemeMapper
}

export type PdfViewerHandle = {
  appendDocumentChunk: (params: { base64: string }) => void
  beginDocument: (params: { byteLength: number }) => void
  finishDocument: () => void
}

export const PdfViewerWebview = forwardRef<PdfViewerHandle, PdfViewerWebviewProps>((props, ref): JSX.Element => {
  const { colors } = useThemePreference().navigationTheme
  const [contentHeight, setContentHeight] = useState(1)
  const [isViewerReady, setIsViewerReady] = useState(false)
  const [viewerHtml, setViewerHtml] = useState<string | null>(null)
  const webViewRef = useRef<WebView>(null)
  const pendingMessagesRef = useRef<PdfViewerMessageIn[]>([])

  const injectViewerMessage = (params: { message: PdfViewerMessageIn }): void => {
    const serializedMessage = JSON.stringify(params.message)
    webViewRef.current?.injectJavaScript(
      `window.__turnstonePdfReceive && window.__turnstonePdfReceive(${serializedMessage}); true;`,
    )
  }

  const sendViewerMessage = (params: { message: PdfViewerMessageIn }): void => {
    if (!isViewerReady) {
      pendingMessagesRef.current = [...pendingMessagesRef.current, params.message]

      return
    }
    injectViewerMessage({ message: params.message })
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

  const matchViewerMessageFields = (params: { fields: Record<string, unknown> }): PdfViewerMessageOut | null => {
    switch (params.fields.type) {
      case 'content-height': {
        const height = toFiniteNumber(params.fields.height)
        if (height === null) {
          return null
        }

        return { height, type: 'content-height' }
      }
      case 'document-meta': {
        const pageCount = toFiniteNumber(params.fields.pageCount)
        if (pageCount === null) {
          return null
        }

        return { pageCount, type: 'document-meta' }
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

  const parseViewerMessageOut = (raw: string): PdfViewerMessageOut | null => {
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
      case 'document-meta': {
        props.onDocumentMeta?.(message.pageCount)

        return
      }
      case 'error': {
        props.onError?.(message.message)

        return
      }
    }
  }

  const handleLoadEnd = (): void => {
    if (isViewerReady) {
      return
    }
    setIsViewerReady(true)
    const pendingMessages = pendingMessagesRef.current
    pendingMessagesRef.current = []
    pendingMessages.forEach((message) => {
      injectViewerMessage({ message })
    })
  }

  useEffect(() => {
    const cancelState = { isCancelled: false }
    void pdfViewerHtml
      .load()
      .then((html: string) => {
        if (cancelState.isCancelled) {
          return
        }
        setViewerHtml(html)
      })
      .catch((error: unknown) => {
        props.onError?.(String(error))
      })

    return () => {
      cancelState.isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isViewerReady) {
      return
    }
    sendViewerMessage({ message: { theme: props.theme, type: 'set-theme' } })
  }, [isViewerReady, props.theme])

  useImperativeHandle(ref, () => {
    return {
      appendDocumentChunk: (params: { base64: string }) => {
        sendViewerMessage({ message: { base64: params.base64, type: 'load-chunk' } })
      },
      beginDocument: (params: { byteLength: number }) => {
        sendViewerMessage({ message: { byteLength: params.byteLength, type: 'load-begin' } })
      },
      finishDocument: () => {
        sendViewerMessage({ message: { type: 'load-end' } })
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
    minHeight: 240,
  },
  webview: {
    backgroundColor: 'transparent',
  },
})
