import { type JSX } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { fileSizeUtil } from '#src/util/file-size-util'

interface BinaryPlaceholderProps {
  fileName: string
  note?: string
  size: number
}

export const BinaryPlaceholder = (props: BinaryPlaceholderProps): JSX.Element => {
  const { colors } = useThemePreference().navigationTheme

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Binary file</Text>
      <Text numberOfLines={1} style={[styles.detail, { color: colors.text }]}>
        {props.fileName}
      </Text>
      <Text style={[styles.detail, { color: colors.text }]}>{fileSizeUtil.format({ bytes: props.size })}</Text>
      {props.note !== undefined && <Text style={[styles.hint, { color: colors.text }]}>{props.note}</Text>}
      {props.note === undefined && (
        <Text style={[styles.hint, { color: colors.text }]}>Binary content is not displayed.</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
    padding: 32,
  },
  detail: {
    fontSize: 14,
    opacity: 0.8,
  },
  hint: {
    fontSize: 13,
    opacity: 0.6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
})
