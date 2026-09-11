import { type JSX, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

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

export const MermaidDiagram = (props: MermaidDiagramProps): JSX.Element => {
  const { effectiveScheme, navigationTheme } = useThemePreference()
  const [contentHeight, setContentHeight] = useState(1)
  const [isViewerReady, setIsViewerReady] = useState(false)
  const [viewerHtml, setViewerHtml] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const viewerTheme = useMemo(() => {
    return resolveViewerTheme({ scheme: effectiveScheme })
  }, [effectiveScheme])

  const sendViewerMessage = (params: { message: MermaidViewerMessageIn }): void => {
    iframeRef.current?.contentWindow?.postMessage(params.message, '*')
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

  const handleWindowMessage = (event: MessageEvent): void => {
    if (event.source !== iframeRef.current?.contentWindow) {
      return
    }
    if (!isRecord(event.data)) {
      return
    }
    const message = matchViewerMessageFields({ fields: event.data })
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

  const handleLoad = (): void => {
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
    window.addEventListener('message', handleWindowMessage)

    return () => {
      window.removeEventListener('message', handleWindowMessage)
    }
  })

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
      <iframe
        onLoad={handleLoad}
        ref={iframeRef}
        sandbox="allow-scripts allow-same-origin"
        srcDoc={viewerHtml}
        style={{ border: 'none', display: 'block', height: contentHeight, width: '100%' }}
        title="turnstone-mermaid-viewer"
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
})
