import { type JSX } from 'react'
import { StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'

import { useThemePreference } from '#src/ui-component/theme/theme-context'

interface HtmlPreviewWebviewProps {
  html: string
}

const isInitialDocumentUrl = (params: { url: string }): boolean => {
  if (params.url === 'about:blank' || params.url.startsWith('about:blank#')) {
    return true
  }

  return false
}

export const HtmlPreviewWebview = (props: HtmlPreviewWebviewProps): JSX.Element => {
  const { colors } = useThemePreference().navigationTheme

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebView
        domStorageEnabled
        javaScriptEnabled
        onShouldStartLoadWithRequest={(request) => {
          return isInitialDocumentUrl({ url: request.url })
        }}
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        source={{ html: props.html }}
        style={styles.webview}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    backgroundColor: 'transparent',
    flex: 1,
  },
})
