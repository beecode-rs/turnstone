import { Image, type ImageLoadEventData } from 'expo-image'
import { type JSX, useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'

import { useMarkdownImageSource } from '#src/ui-component/markdown/markdown-image-source'
import { binaryPreviewUtil } from '#src/util/binary-preview-util'
import { markdownImageSizeUtil } from '#src/util/markdown-image-size-util'

interface MarkdownImageProps {
  accessibilityLabel?: string
  hostId: string
  markdownPath: string
  maxWidth: number
  src: string
  widthAttr?: string | null
}

export const MarkdownImage = (props: MarkdownImageProps): JSX.Element | null => {
  const source = useMarkdownImageSource({ hostId: props.hostId, markdownPath: props.markdownPath, src: props.src })
  const [sourceSize, setSourceSize] = useState<{ height: number; width: number } | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(false)
    setSourceSize(null)
  }, [source])

  const handleLoad = (event: ImageLoadEventData): void => {
    setIsLoaded(true)
    const loadedSource = event.source
    if (typeof loadedSource.height !== 'number' || typeof loadedSource.width !== 'number') {
      return
    }
    setSourceSize({ height: loadedSource.height, width: loadedSource.width })
  }

  if (source === null) {
    return null
  }

  if (!isLoaded) {
    return (
      <Image
        accessibilityLabel={props.accessibilityLabel}
        onLoad={handleLoad}
        source={{ uri: source }}
        style={styles.hiddenSizer}
      />
    )
  }

  const targetWidth = markdownImageSizeUtil.resolveTargetWidth({
    attrWidth: markdownImageSizeUtil.resolveAttrWidth({ widthAttr: props.widthAttr ?? null }),
    maxWidth: props.maxWidth,
    sourceSize,
  })
  const aspect = binaryPreviewUtil.resolveAspect({
    sourceHeight: sourceSize?.height,
    sourceWidth: sourceSize?.width,
  })

  return (
    <Image
      accessibilityLabel={props.accessibilityLabel}
      onLoad={handleLoad}
      source={{ uri: source }}
      style={{ height: targetWidth / aspect, width: targetWidth }}
    />
  )
}

const styles = StyleSheet.create({
  hiddenSizer: {
    height: 1,
    opacity: 0,
    width: 1,
  },
})
