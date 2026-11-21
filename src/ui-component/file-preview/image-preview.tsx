import { type ImageLoadEventData } from 'expo-image'
import { type JSX, useMemo, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'

import { FullscreenImageViewer } from '#src/ui-component/file-preview/fullscreen-image-viewer'
import { ZoomableImage } from '#src/ui-component/file-preview/zoomable-image'
import { binaryPreviewUtil } from '#src/util/binary-preview-util'

const ZOOM_HEIGHT_RATIO = 0.7

interface ImagePreviewProps {
  isExpandable?: boolean
  onError?: () => void
  onZoomChange?: (isZoomed: boolean) => void
  uri: string
}

export const ImagePreview = (props: ImagePreviewProps): JSX.Element => {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions()
  const [aspect, setAspect] = useState<number | null>(null)
  const [isFullscreenVisible, setIsFullscreenVisible] = useState(false)

  const containerHeight = useMemo(() => {
    const maxHeight = windowHeight * ZOOM_HEIGHT_RATIO
    if (aspect === null) {
      return maxHeight
    }
    const fitHeight = windowWidth / aspect

    return Math.min(fitHeight, maxHeight)
  }, [aspect, windowHeight, windowWidth])

  const handleLoad = (event: ImageLoadEventData): void => {
    setAspect(
      binaryPreviewUtil.resolveAspect({
        sourceHeight: event.source.height,
        sourceWidth: event.source.width,
      }),
    )
  }

  const handleSingleTap = (): void => {
    if (props.isExpandable !== true) {
      return
    }
    setIsFullscreenVisible(true)
  }

  const handleCloseFullscreen = (): void => {
    setIsFullscreenVisible(false)
  }

  return (
    <>
      <View style={[styles.frame, { height: containerHeight }]}>
        <ZoomableImage
          onError={props.onError}
          onLoad={handleLoad}
          onSingleTap={handleSingleTap}
          onZoomChange={props.onZoomChange}
          uri={props.uri}
        />
      </View>
      {props.isExpandable === true && (
        <FullscreenImageViewer isVisible={isFullscreenVisible} onClose={handleCloseFullscreen} uri={props.uri} />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
  },
})
