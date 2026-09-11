import { type JSX } from 'react'
import { StyleSheet, View } from 'react-native'

import { useThemePreference } from '#src/ui-component/theme/theme-context'

interface HtmlPreviewWebviewProps {
  html: string
}

export const HtmlPreviewWebview = (props: HtmlPreviewWebviewProps): JSX.Element => {
  const { colors } = useThemePreference().navigationTheme

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <iframe
        sandbox="allow-scripts"
        srcDoc={props.html}
        style={{ border: 'none', display: 'block', flexGrow: 1, width: '100%' }}
        title="turnstone-html-preview"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
