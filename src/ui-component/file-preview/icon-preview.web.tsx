import { type JSX } from 'react'
import { StyleSheet, View } from 'react-native'

import { useThemePreference } from '#src/ui-component/theme/theme-context'

interface IconPreviewProps {
  dataUri: string
}

export const IconPreview = (props: IconPreviewProps): JSX.Element => {
  const { colors } = useThemePreference().navigationTheme

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <img alt="" src={props.dataUri} style={{ maxHeight: 280, maxWidth: '100%' }} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
    padding: 24,
  },
})
