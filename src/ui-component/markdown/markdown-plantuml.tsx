import { type JSX, type ReactNode, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { ImagePreview } from '#src/ui-component/file-preview/image-preview'
import { usePlantumlDiagramSource } from '#src/ui-component/plantuml/use-plantuml-diagram-source'

interface MarkdownPlantumlProps {
  fallback: ReactNode
  source: string
}

export const MarkdownPlantuml = (props: MarkdownPlantumlProps): JSX.Element => {
  const { result } = usePlantumlDiagramSource({ source: props.source })
  const [isImageLoadFailed, setIsImageLoadFailed] = useState(false)

  useEffect(() => {
    setIsImageLoadFailed(false)
  }, [result])

  if (result.kind !== 'image' || isImageLoadFailed) {
    return <>{props.fallback}</>
  }

  return (
    <View style={styles.diagramFrame}>
      <ImagePreview
        isExpandable
        onError={() => {
          setIsImageLoadFailed(true)
        }}
        uri={result.source}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  diagramFrame: {
    marginVertical: 8,
  },
})
