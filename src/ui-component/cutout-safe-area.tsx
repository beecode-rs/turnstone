import { type JSX, type ReactNode } from 'react'
import { type StyleProp, type ViewStyle } from 'react-native'
import { type Edge, SafeAreaView } from 'react-native-safe-area-context'

import { useDisplayCutout } from '#src/ui-component/display-cutout-context'

const resolveEdges = (params: { isContentBehindCutout: boolean }): Edge[] => {
  if (params.isContentBehindCutout) {
    return []
  }

  return ['left', 'right']
}

export const CutoutSafeArea = (props: { children: ReactNode; style?: StyleProp<ViewStyle> }): JSX.Element => {
  const { isContentBehindCutout } = useDisplayCutout()

  return (
    <SafeAreaView edges={resolveEdges({ isContentBehindCutout })} style={props.style}>
      {props.children}
    </SafeAreaView>
  )
}
