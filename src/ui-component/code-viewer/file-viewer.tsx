import { type JSX, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { BinaryPreviewKindMapper } from '#src/business/enum/binary-preview-kind-mapper-enum'
import { EffectiveThemeSchemeMapper } from '#src/business/enum/effective-theme-scheme-mapper-enum'
import { ViewerThemeMapper } from '#src/business/enum/viewer-theme-mapper-enum'
import {
  FileCapReachedError,
  type FileContent,
  type FileOpenResult,
  type FileReadState,
} from '#src/business/model/file-content'
import { type SshTransport } from '#src/business/model/ssh-transport'
import { type BinaryPreviewPlan, BinaryPreviewService } from '#src/business/service/binary-preview-service'
import { FileReadService } from '#src/business/service/file-read-service'
import { changeWatchUseCase } from '#src/business/use-case/change-watch-use-case'
import { serverConnectUseCase } from '#src/business/use-case/server-connect-use-case'
import { BinaryPlaceholder } from '#src/ui-component/code-viewer/binary-placeholder'
import { type CodeViewerHandle, CodeViewerWebview } from '#src/ui-component/code-viewer/code-viewer-webview'
import { useFontSize } from '#src/ui-component/code-viewer/font-size-context'
import { FONT_SIZE_METRICS } from '#src/ui-component/code-viewer/font-size-metrics'
import { useLineNumbers } from '#src/ui-component/code-viewer/line-numbers-context'
import { LoadMoreFooter } from '#src/ui-component/code-viewer/load-more-footer'
import { useViewMargin } from '#src/ui-component/code-viewer/view-margin-context'
import { VIEW_MARGIN_METRICS } from '#src/ui-component/code-viewer/view-margin-metrics'
import { useWordWrap } from '#src/ui-component/code-viewer/word-wrap-context'
import { CutoutSafeArea } from '#src/ui-component/cutout-safe-area'
import { IconPreview } from '#src/ui-component/file-preview/icon-preview'
import { ImagePreview } from '#src/ui-component/file-preview/image-preview'
import { type PdfViewerHandle, PdfViewerWebview } from '#src/ui-component/file-preview/pdf-viewer-webview'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { binaryPreviewUtil } from '#src/util/binary-preview-util'
import { constant } from '#src/util/constant'
import { fileSizeUtil } from '#src/util/file-size-util'
import { remotePathUtil } from '#src/util/remote-path-util'

const EXPLICIT_LOAD_BYTES = 1048576
const AUTO_LOAD_TRIGGER_PIXELS = 600
const PULL_DOWN_TOP_OFFSET_MAX_PX = 1

type ReadyPreviewPlan = Extract<BinaryPreviewPlan, { status: 'ready' }>

type ImagePreviewKind = BinaryPreviewKindMapper.ICON | BinaryPreviewKindMapper.IMAGE | BinaryPreviewKindMapper.SVG

type FilePreviewState =
  | { base64: string; kind: 'image-data'; mimeType: string; previewKind: ImagePreviewKind; size: number }
  | { kind: 'image-loading'; size: number }
  | { kind: 'load-error'; size: number }
  | { kind: 'pdf-stream'; loadedBytes: number; size: number }
  | { kind: 'cap-exceeded'; size: number }

interface FileViewerProps {
  hostId: string
  isCodeViewForced?: boolean
  isFocused: () => boolean
  language: string
  path: string
}

export type FileViewerHandle = {
  reload: () => void
}

const resolveFileName = (params: { path: string }): string => {
  return remotePathUtil.toParts({ path: params.path }).at(-1) ?? ''
}

const resolveFirstVisibleLine = (params: {
  lineHeightPx: number
  scrollOffsetYPx: number
  topPaddingPx: number
}): number => {
  const lineOffsetPx = params.scrollOffsetYPx - params.topPaddingPx
  if (lineOffsetPx <= 0) {
    return 1
  }

  return Math.floor(lineOffsetPx / params.lineHeightPx) + 1
}

const resolveScrollOffsetForLine = (params: { line: number; lineHeightPx: number; topPaddingPx: number }): number => {
  return params.topPaddingPx + (params.line - 1) * params.lineHeightPx
}

const resolveViewerTheme = (params: { scheme: EffectiveThemeSchemeMapper }): ViewerThemeMapper => {
  if (params.scheme === EffectiveThemeSchemeMapper.DARK) {
    return ViewerThemeMapper.DARK
  }

  return ViewerThemeMapper.LIGHT
}

const resolvePdfPageLabel = (params: { pageCount: number }): string => {
  if (params.pageCount === 1) {
    return '1 page'
  }

  return `${String(params.pageCount)} pages`
}

export const FileViewer = forwardRef<FileViewerHandle, FileViewerProps>((props, ref): JSX.Element => {
  const { effectiveScheme, navigationTheme } = useThemePreference()
  const { isLineNumbersHidden } = useLineNumbers()
  const { isWordWrapEnabled } = useWordWrap()
  const { fontSize } = useFontSize()
  const { margin } = useViewMargin()
  const { colors } = navigationTheme
  const viewerHandleRef = useRef<CodeViewerHandle>(null)
  const pdfViewerHandleRef = useRef<PdfViewerHandle>(null)
  const pdfPendingCommandsRef = useRef<((handle: PdfViewerHandle) => void)[]>([])
  const isChunkInFlightRef = useRef(false)
  const scrollRef = useRef<ScrollViewInstance>(null)
  const scrollOffsetRef = useRef(0)
  const viewerExtentRef = useRef({ loadedBytes: 0 })
  const reloadGuardRef = useRef({ isInFlight: false, isPending: false })
  const restoreAnchorRef = useRef<{ line: number | null }>({ line: null })
  const pdfStreamCancelRef = useRef<{ isCancelled: boolean } | null>(null)
  const previewStateRef = useRef<FilePreviewState | null>(null)
  const [fileContent, setFileContent] = useState<FileContent | null>(null)
  const [initialText, setInitialText] = useState('')
  const [isCapStopReached, setIsCapStopReached] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null)
  const [previewState, setPreviewState] = useState<FilePreviewState | null>(null)
  const [readState, setReadState] = useState<FileReadState | null>(null)
  const fileReadService = useMemo(() => {
    return new FileReadService()
  }, [])
  const binaryPreviewService = useMemo(() => {
    return new BinaryPreviewService()
  }, [])

  const fileName = useMemo(() => {
    return resolveFileName({ path: props.path })
  }, [props.path])
  const viewerTheme = useMemo(() => {
    return resolveViewerTheme({ scheme: effectiveScheme })
  }, [effectiveScheme])
  const fontSizeMetrics = useMemo(() => {
    return FONT_SIZE_METRICS[fontSize]
  }, [fontSize])
  const viewMarginMetrics = useMemo(() => {
    return VIEW_MARGIN_METRICS[margin]
  }, [margin])
  const textContent = useMemo(() => {
    if (fileContent === null || fileContent.isBinary) {
      return null
    }

    return fileContent
  }, [fileContent])

  useEffect(() => {
    previewStateRef.current = previewState
  }, [previewState])

  const sendPdfCommand = (params: { command: (handle: PdfViewerHandle) => void }): void => {
    const handle = pdfViewerHandleRef.current
    if (handle === null) {
      pdfPendingCommandsRef.current = [...pdfPendingCommandsRef.current, params.command]

      return
    }
    params.command(handle)
  }

  useEffect(() => {
    const pendingCommands = pdfPendingCommandsRef.current
    if (pendingCommands.length === 0) {
      return
    }
    pdfPendingCommandsRef.current = []
    pendingCommands.forEach((command) => {
      sendPdfCommand({ command })
    })
  }, [previewState])

  const requestChunk = (params: { state: FileReadState }): Promise<FileOpenResult | null> => {
    return serverConnectUseCase
      .getTransport({ hostId: props.hostId })
      .then((transport) => {
        return fileReadService.loadMore({ state: params.state, transport })
      })
      .then((result) => {
        setFileContent(result.content)
        setReadState(result.state)
        if (!result.content.isBinary) {
          viewerExtentRef.current = { loadedBytes: result.content.loadedBytes }
          viewerHandleRef.current?.injectChunk({ text: result.content.text })
        }

        return result
      })
      .catch((error: unknown) => {
        if (error instanceof FileCapReachedError) {
          setIsCapStopReached(true)

          return null
        }
        Alert.alert('Load failed', String(error))

        return null
      })
  }

  const loadRemainingChunks = (params: { state: FileReadState }): Promise<void> => {
    return requestChunk({ state: params.state }).then((result) => {
      if (result === null) {
        return undefined
      }
      if (result.state === null) {
        return undefined
      }
      if (result.content.isBinary || result.content.isCapReached) {
        return undefined
      }

      return loadRemainingChunks({ state: result.state })
    })
  }

  const loadNextChunkOnce = (): void => {
    if (isChunkInFlightRef.current || textContent === null || readState === null) {
      return
    }
    if (!textContent.hasMore || textContent.isCapReached || isCapStopReached) {
      return
    }
    if (textContent.loadedBytes >= EXPLICIT_LOAD_BYTES) {
      return
    }
    isChunkInFlightRef.current = true
    setIsLoadingMore(true)
    void requestChunk({ state: readState }).finally(() => {
      isChunkInFlightRef.current = false
      setIsLoadingMore(false)
    })
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y
    const distanceFromBottom =
      event.nativeEvent.contentSize.height -
      event.nativeEvent.layoutMeasurement.height -
      event.nativeEvent.contentOffset.y
    if (distanceFromBottom > AUTO_LOAD_TRIGGER_PIXELS) {
      return
    }
    loadNextChunkOnce()
  }

  const reloadChunksToExtent = (params: { result: FileOpenResult; targetLoadedBytes: number }): Promise<void> => {
    const { content } = params.result
    if (params.result.state === null || content.isBinary || content.isCapReached) {
      return Promise.resolve()
    }
    if (content.loadedBytes >= params.targetLoadedBytes) {
      return Promise.resolve()
    }

    return requestChunk({ state: params.result.state }).then((nextResult) => {
      if (nextResult === null) {
        return undefined
      }

      return reloadChunksToExtent({ result: nextResult, targetLoadedBytes: params.targetLoadedBytes })
    })
  }

  const applyOpenResult = (params: { result: FileOpenResult }): void => {
    setFileContent(params.result.content)
    setReadState(params.result.state)
    if (!params.result.content.isBinary) {
      viewerExtentRef.current = { loadedBytes: params.result.content.loadedBytes }
      setInitialText(params.result.content.text)
    }
  }

  const reloadFileContent = (): Promise<FileOpenResult | null> => {
    return serverConnectUseCase
      .getTransport({ hostId: props.hostId })
      .then((transport) => {
        return fileReadService.openFile({ path: props.path, transport })
      })
      .then((result) => {
        applyOpenResult({ result })

        return result
      })
      .catch((error: unknown) => {
        Alert.alert('Reload failed', String(error))

        return null
      })
  }

  const openTextFile = (params: { cancelState: { isCancelled: boolean }; transport: SshTransport }): Promise<void> => {
    return fileReadService.openFile({ path: props.path, transport: params.transport }).then((result) => {
      if (params.cancelState.isCancelled) {
        return undefined
      }
      applyOpenResult({ result })
    })
  }

  const loadImagePreview = (params: {
    cancelState: { isCancelled: boolean }
    plan: ReadyPreviewPlan
    previewKind: ImagePreviewKind
    transport: SshTransport
  }): Promise<void> => {
    return binaryPreviewService
      .loadImagePreview({ fileName, path: props.path, size: params.plan.size, transport: params.transport })
      .then((imageResult) => {
        if (params.cancelState.isCancelled) {
          return undefined
        }
        setPreviewState({
          base64: imageResult.base64,
          kind: 'image-data',
          mimeType: imageResult.mimeType,
          previewKind: params.previewKind,
          size: params.plan.size,
        })
      })
      .catch((error: unknown) => {
        if (params.cancelState.isCancelled) {
          return undefined
        }
        setPreviewState({ kind: 'load-error', size: params.plan.size })
        Alert.alert('Preview failed', String(error))
      })
  }

  const streamPdfChunks = (params: {
    cancelState: { isCancelled: boolean }
    offset: number
    size: number
    transport: SshTransport
  }): Promise<void> => {
    return binaryPreviewService
      .readChunk({ offset: params.offset, path: props.path, size: params.size, transport: params.transport })
      .then((chunk) => {
        if (params.cancelState.isCancelled) {
          return undefined
        }
        const currentPreviewState = previewStateRef.current
        if (currentPreviewState !== null && currentPreviewState.kind === 'load-error') {
          return undefined
        }
        sendPdfCommand({
          command: (handle) => {
            handle.appendDocumentChunk({ base64: chunk.base64 })
          },
        })
        setPreviewState({ kind: 'pdf-stream', loadedBytes: chunk.nextOffset, size: params.size })
        if (chunk.isFinal) {
          sendPdfCommand({
            command: (handle) => {
              handle.finishDocument()
            },
          })

          return undefined
        }

        return streamPdfChunks({ ...params, offset: chunk.nextOffset })
      })
  }

  const streamPdfPreview = (params: {
    cancelState: { isCancelled: boolean }
    plan: ReadyPreviewPlan
    transport: SshTransport
  }): Promise<void> => {
    if (pdfStreamCancelRef.current !== null) {
      pdfStreamCancelRef.current.isCancelled = true
    }
    const streamCancelState = { isCancelled: false }
    pdfStreamCancelRef.current = streamCancelState
    setPreviewState({ kind: 'pdf-stream', loadedBytes: 0, size: params.plan.size })
    sendPdfCommand({
      command: (handle) => {
        handle.beginDocument({ byteLength: params.plan.size })
      },
    })

    return streamPdfChunks({
      cancelState: streamCancelState,
      offset: 0,
      size: params.plan.size,
      transport: params.transport,
    }).catch((error: unknown) => {
      if (streamCancelState.isCancelled || params.cancelState.isCancelled) {
        return undefined
      }
      setPreviewState({ kind: 'load-error', size: params.plan.size })
      Alert.alert('Preview failed', String(error))
    })
  }

  const loadPreviewByKind = (params: {
    cancelState: { isCancelled: boolean }
    plan: ReadyPreviewPlan
    transport: SshTransport
  }): Promise<void> => {
    if (params.plan.kind === BinaryPreviewKindMapper.PDF) {
      return streamPdfPreview({ cancelState: params.cancelState, plan: params.plan, transport: params.transport })
    }
    setPreviewState({ kind: 'image-loading', size: params.plan.size })

    return loadImagePreview({
      cancelState: params.cancelState,
      plan: params.plan,
      previewKind: params.plan.kind,
      transport: params.transport,
    })
  }

  const openFileOrPreview = (params: {
    cancelState: { isCancelled: boolean }
    transport: SshTransport
  }): Promise<void> => {
    const previewKind = binaryPreviewUtil.classify({
      fileName,
      isSvgPreviewDisabled: props.isCodeViewForced === true,
    })
    if (previewKind === BinaryPreviewKindMapper.UNSUPPORTED) {
      return openTextFile({ cancelState: params.cancelState, transport: params.transport })
    }

    return binaryPreviewService
      .openPreview({
        fileName,
        isSvgPreviewDisabled: props.isCodeViewForced === true,
        path: props.path,
        transport: params.transport,
      })
      .then((plan) => {
        if (params.cancelState.isCancelled) {
          return undefined
        }
        if (plan.status === 'unsupported') {
          return openTextFile({ cancelState: params.cancelState, transport: params.transport })
        }
        if (plan.status === 'exceeds-cap') {
          setPreviewState({ kind: 'cap-exceeded', size: plan.size })

          return undefined
        }
        setIsLoading(false)

        return loadPreviewByKind({ cancelState: params.cancelState, plan, transport: params.transport })
      })
  }

  const reloadPreview = (): Promise<void> => {
    const scrollOffset = scrollOffsetRef.current

    return serverConnectUseCase
      .getTransport({ hostId: props.hostId })
      .then((transport) => {
        return openFileOrPreview({ cancelState: { isCancelled: false }, transport })
      })
      .then(() => {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ animated: false, y: scrollOffset })
        })
      })
      .catch((error: unknown) => {
        Alert.alert('Reload failed', String(error))
      })
  }

  const runGuardedReload = (reload: () => Promise<void>): void => {
    if (reloadGuardRef.current.isInFlight) {
      reloadGuardRef.current = { ...reloadGuardRef.current, isPending: true }

      return
    }
    reloadGuardRef.current = { isInFlight: true, isPending: false }
    void reload().finally(() => {
      reloadGuardRef.current = { ...reloadGuardRef.current, isInFlight: false }
      if (!reloadGuardRef.current.isPending) {
        setIsRefreshing(false)

        return
      }
      reloadGuardRef.current = { ...reloadGuardRef.current, isPending: false }
      handleWatchedFileChange()
    })
  }

  const handleWatchedFileChange = (): void => {
    if (previewStateRef.current !== null) {
      runGuardedReload(reloadPreview)

      return
    }
    restoreAnchorRef.current = {
      line: resolveFirstVisibleLine({
        lineHeightPx: fontSizeMetrics.codeLineHeightPx,
        scrollOffsetYPx: scrollOffsetRef.current,
        topPaddingPx: viewMarginMetrics.codeVertical,
      }),
    }
    const targetLoadedBytes = viewerExtentRef.current.loadedBytes
    runGuardedReload(() => {
      return reloadFileContent().then((result) => {
        if (result === null) {
          restoreAnchorRef.current = { line: null }

          return undefined
        }

        return reloadChunksToExtent({ result, targetLoadedBytes })
      })
    })
  }

  const handlePullToRefresh = (): void => {
    setIsRefreshing(true)
    handleWatchedFileChange()
  }

  const handleViewerPullDown = (): void => {
    if (scrollOffsetRef.current > PULL_DOWN_TOP_OFFSET_MAX_PX) {
      return
    }
    handlePullToRefresh()
  }

  useImperativeHandle(ref, () => {
    return {
      reload: () => {
        if (isLoading) {
          return
        }
        handleWatchedFileChange()
      },
    }
  })

  const handleContentHeight = (): void => {
    const anchorLine = restoreAnchorRef.current.line
    if (anchorLine === null) {
      return
    }
    restoreAnchorRef.current = { line: null }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          animated: false,
          y: resolveScrollOffsetForLine({
            line: anchorLine,
            lineHeightPx: fontSizeMetrics.codeLineHeightPx,
            topPaddingPx: viewMarginMetrics.codeVertical,
          }),
        })
      })
    })
  }

  const handleLoadMorePress = (): void => {
    if (readState === null) {
      return
    }
    setIsLoadingMore(true)
    void loadRemainingChunks({ state: readState }).finally(() => {
      setIsLoadingMore(false)
    })
  }

  const handleImagePreviewError = (params: { size: number }): void => {
    setPreviewState({ kind: 'load-error', size: params.size })
  }

  const handlePdfError = (params: { size: number }): void => {
    setPreviewState({ kind: 'load-error', size: params.size })
  }

  useEffect(() => {
    const cancelState = { isCancelled: false }
    setIsLoading(true)
    setIsCapStopReached(false)
    setFileContent(null)
    setInitialText('')
    setPdfPageCount(null)
    setPreviewState(null)
    setReadState(null)
    pdfPendingCommandsRef.current = []
    scrollOffsetRef.current = 0
    viewerExtentRef.current = { loadedBytes: 0 }
    restoreAnchorRef.current = { line: null }
    void serverConnectUseCase
      .getTransport({ hostId: props.hostId })
      .then((transport) => {
        return openFileOrPreview({ cancelState, transport })
      })
      .catch((error: unknown) => {
        if (cancelState.isCancelled) {
          return
        }
        Alert.alert('Open failed', `${props.path}\n${String(error)}`)
      })
      .finally(() => {
        if (cancelState.isCancelled) {
          return
        }
        setIsLoading(false)
      })

    return () => {
      cancelState.isCancelled = true
    }
  }, [binaryPreviewService, fileReadService, props.hostId, props.isCodeViewForced, props.path])

  useEffect(() => {
    const unsubscribeWatch: { current: (() => void) | null } = { current: null }
    const cancelState = { isCancelled: false }
    void serverConnectUseCase
      .getTransport({ hostId: props.hostId })
      .then((transport) => {
        if (cancelState.isCancelled) {
          return
        }
        unsubscribeWatch.current = changeWatchUseCase.watchFile({
          hostId: props.hostId,
          isFocused: props.isFocused,
          onChange: () => {
            handleWatchedFileChange()
          },
          path: props.path,
          transport,
        })
      })
      .catch(() => {
        return undefined
      })

    return () => {
      cancelState.isCancelled = true
      unsubscribeWatch.current?.()
    }
  }, [fileReadService, props.hostId, props.isFocused, props.path])

  const resolvePreviewNote = (params: { kind: 'cap-exceeded' | 'load-error' }): string => {
    if (params.kind === 'cap-exceeded') {
      return `File exceeds the ${fileSizeUtil.format({ bytes: constant.binaryPreview.capBytes })} preview limit.`
    }

    return 'Preview failed to load.'
  }

  if (isLoading) {
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
        onScroll={handleScroll}
        ref={scrollRef}
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
        {previewState === null && fileContent !== null && fileContent.isBinary && (
          <BinaryPlaceholder fileName={fileName} size={fileContent.size} />
        )}
        {previewState !== null && (previewState.kind === 'cap-exceeded' || previewState.kind === 'load-error') && (
          <BinaryPlaceholder
            fileName={fileName}
            note={resolvePreviewNote({ kind: previewState.kind })}
            size={previewState.size}
          />
        )}
        {previewState !== null && previewState.kind === 'image-loading' && (
          <View style={styles.previewLoadingContainer}>
            <ActivityIndicator color={String(colors.primary)} />
          </View>
        )}
        {previewState !== null &&
          previewState.kind === 'image-data' &&
          previewState.previewKind === BinaryPreviewKindMapper.ICON && (
            <IconPreview
              dataUri={binaryPreviewUtil.toDataUri({ base64: previewState.base64, mimeType: previewState.mimeType })}
            />
          )}
        {previewState !== null &&
          previewState.kind === 'image-data' &&
          previewState.previewKind !== BinaryPreviewKindMapper.ICON && (
            <ImagePreview
              onError={() => {
                handleImagePreviewError({ size: previewState.size })
              }}
              uri={binaryPreviewUtil.toDataUri({ base64: previewState.base64, mimeType: previewState.mimeType })}
            />
          )}
        {previewState !== null && previewState.kind === 'pdf-stream' && (
          <PdfViewerWebview
            onDocumentMeta={(pageCount) => {
              setPdfPageCount(pageCount)
            }}
            onError={() => {
              handlePdfError({ size: previewState.size })
            }}
            ref={pdfViewerHandleRef}
            theme={viewerTheme}
          />
        )}
        {previewState !== null &&
          previewState.kind === 'pdf-stream' &&
          previewState.loadedBytes < previewState.size && (
            <View style={styles.pdfProgressContainer}>
              <ActivityIndicator color={String(colors.primary)} />
              <Text style={[styles.pdfProgressText, { color: colors.text }]}>
                {fileSizeUtil.format({ bytes: previewState.loadedBytes })} of{' '}
                {fileSizeUtil.format({ bytes: previewState.size })}
              </Text>
            </View>
          )}
        {previewState !== null &&
          previewState.kind === 'pdf-stream' &&
          previewState.loadedBytes >= previewState.size &&
          pdfPageCount !== null && (
            <Text style={[styles.pdfProgressText, { color: colors.text }]}>
              {resolvePdfPageLabel({ pageCount: pdfPageCount })}
            </Text>
          )}
        {textContent !== null && (
          <CodeViewerWebview
            content={initialText}
            fontSize={fontSize}
            isLineNumbersHidden={isLineNumbersHidden}
            language={props.language}
            margin={margin}
            onContentHeight={handleContentHeight}
            onPullDown={handleViewerPullDown}
            ref={viewerHandleRef}
            theme={viewerTheme}
            wordWrap={isWordWrapEnabled}
          />
        )}
        {textContent !== null && (
          <LoadMoreFooter
            formattedLoadedSize={fileSizeUtil.format({ bytes: textContent.loadedBytes })}
            formattedTotalSize={fileSizeUtil.format({ bytes: textContent.size })}
            hasMore={textContent.hasMore}
            isCapReached={textContent.isCapReached || isCapStopReached}
            isExplicitLoadRequired={textContent.hasMore && textContent.loadedBytes >= EXPLICIT_LOAD_BYTES}
            isLoadingMore={isLoadingMore}
            onPressLoadMore={handleLoadMorePress}
          />
        )}
      </ScrollView>
    </CutoutSafeArea>
  )
})

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  pdfProgressContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    padding: 16,
  },
  pdfProgressText: {
    fontSize: 13,
    opacity: 0.7,
  },
  previewLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 240,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
})
