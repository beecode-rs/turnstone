import { type JSX } from 'react'
import { StyleSheet, View } from 'react-native'

import { MarkdownImage } from '#src/ui-component/markdown/markdown-image'
import { useMarkdownImageSource } from '#src/ui-component/markdown/markdown-image-source'

interface MarkdownHtmlImageProps {
  alt: string | undefined
  contentWidth: number
  hostId: string
  markdownPath: string
  src: string
  width: string | undefined
}

export const MarkdownHtmlImage = (props: MarkdownHtmlImageProps): JSX.Element | null => {
  const source = useMarkdownImageSource({
    hostId: props.hostId,
    markdownPath: props.markdownPath,
    src: props.src,
  })
  if (source === null) {
    return null
  }

  return (
    <View style={styles.centeredContainer}>
      <MarkdownImage
        accessibilityLabel={props.alt}
        hostId={props.hostId}
        markdownPath={props.markdownPath}
        maxWidth={props.contentWidth}
        src={props.src}
        widthAttr={props.width ?? null}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  centeredContainer: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'center',
  },
})
