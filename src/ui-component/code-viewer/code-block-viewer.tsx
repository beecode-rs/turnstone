import { type JSX, useMemo } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EffectiveThemeSchemeMapper } from '#src/business/enum/effective-theme-scheme-mapper-enum'
import { ViewerThemeMapper } from '#src/business/enum/viewer-theme-mapper-enum'
import { type MarkdownCodeBlock } from '#src/business/model/markdown-code-block'
import { CodeViewerWebview } from '#src/ui-component/code-viewer/code-viewer-webview'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

interface CodeBlockViewerProps {
  block: MarkdownCodeBlock | null
}

const resolveViewerTheme = (params: { scheme: EffectiveThemeSchemeMapper }): ViewerThemeMapper => {
  if (params.scheme === EffectiveThemeSchemeMapper.DARK) {
    return ViewerThemeMapper.DARK
  }

  return ViewerThemeMapper.LIGHT
}

export const CodeBlockViewer = (props: CodeBlockViewerProps): JSX.Element => {
  const { effectiveScheme, navigationTheme } = useThemePreference()
  const { colors } = navigationTheme
  const viewerTheme = useMemo(() => {
    return resolveViewerTheme({ scheme: effectiveScheme })
  }, [effectiveScheme])

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scroll}>
        {props.block === null && (
          <Text style={[styles.missingText, { color: colors.text }]}>No code block content</Text>
        )}
        {props.block !== null && (
          <CodeViewerWebview content={props.block.text} language={props.block.language} theme={viewerTheme} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  missingText: {
    fontSize: 14,
    opacity: 0.6,
    padding: 32,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
})
