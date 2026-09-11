import { type JSX, type ReactNode, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { MermaidDiagram } from '#src/ui-component/mermaid/mermaid-diagram'

interface MarkdownMermaidProps {
  fallback: ReactNode
  source: string
}

export const MarkdownMermaid = (props: MarkdownMermaidProps): JSX.Element => {
  const [isRenderFailed, setIsRenderFailed] = useState(false)

  useEffect(() => {
    setIsRenderFailed(false)
  }, [props.source])

  if (isRenderFailed) {
    return <>{props.fallback}</>
  }

  return (
    <View style={styles.diagramFrame}>
      <MermaidDiagram
        onError={() => {
          setIsRenderFailed(true)
        }}
        source={props.source}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  diagramFrame: {
    marginVertical: 8,
  },
})
