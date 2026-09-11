import { type JSX } from 'react'
import { StyleSheet } from 'react-native'
import { Text } from 'react-native-paper'

import { useThemePreference } from '#src/ui-component/theme/theme-context'

interface HighlightRun {
  isMatch: boolean
  value: string
}

interface HighlightTextProps {
  indices: number[]
  matchFontFamily?: string
  text: string
}

const toRuns = (params: { indices: number[]; text: string }): HighlightRun[] => {
  const matchIndices = new Set(params.indices)

  return params.text.split('').reduce<HighlightRun[]>((runs, char, charIndex) => {
    const isMatch = matchIndices.has(charIndex)
    if (runs.length > 0 && runs[runs.length - 1].isMatch === isMatch) {
      runs[runs.length - 1].value = `${runs[runs.length - 1].value}${char}`

      return runs
    }
    runs.push({ isMatch, value: char })

    return runs
  }, [])
}

export const HighlightText = (props: HighlightTextProps): JSX.Element => {
  const { md3Theme } = useThemePreference()

  const renderRun = (run: HighlightRun, runIndex: number): JSX.Element => {
    if (!run.isMatch) {
      return <Text key={String(runIndex)}>{run.value}</Text>
    }
    if (props.matchFontFamily === undefined) {
      return (
        <Text key={String(runIndex)} style={[styles.match, { color: md3Theme.colors.primary }]}>
          {run.value}
        </Text>
      )
    }

    return (
      <Text key={String(runIndex)} style={{ color: md3Theme.colors.primary, fontFamily: props.matchFontFamily }}>
        {run.value}
      </Text>
    )
  }

  return <>{toRuns({ indices: props.indices, text: props.text }).map(renderRun)}</>
}

const styles = StyleSheet.create({
  match: {
    fontWeight: '700',
  },
})
