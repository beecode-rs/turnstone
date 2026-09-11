import { type JSX, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'

import { useThemePreference } from '#src/ui-component/theme/theme-context'

interface IconPreviewProps {
  dataUri: string
}

const composeIconHtml = (params: { dataUri: string }): string => {
  return [
    '<!DOCTYPE html><html><head><meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<style>*{box-sizing:border-box}html,body{background:transparent;margin:0;padding:0;width:100%}',
    '#ts-icon-frame{align-items:center;display:flex;justify-content:center;min-height:280px;padding:24px;width:100%}',
    '#ts-icon-frame img{max-height:280px;max-width:100%}</style></head>',
    `<body><div id="ts-icon-frame"><img src="${params.dataUri}" alt="" /></div></body></html>`,
  ].join('')
}

export const IconPreview = (props: IconPreviewProps): JSX.Element => {
  const { colors } = useThemePreference().navigationTheme
  const iconHtml = useMemo(() => {
    return composeIconHtml({ dataUri: props.dataUri })
  }, [props.dataUri])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebView originWhitelist={['*']} scrollEnabled={false} source={{ html: iconHtml }} style={styles.webview} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
  webview: {
    backgroundColor: 'transparent',
    height: 328,
  },
})
