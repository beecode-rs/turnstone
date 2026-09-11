import { type JSX, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import { useThemePreference } from '#src/ui-component/theme/theme-context'

export const SettingsSection = (props: { children: ReactNode; title?: string }): JSX.Element => {
  const { md3Theme } = useThemePreference()

  return (
    <View style={styles.section}>
      {props.title !== undefined && (
        <Text style={[styles.sectionTitle, { color: md3Theme.colors.onSurfaceVariant }]} variant="titleMedium">
          {props.title}
        </Text>
      )}
      {props.children}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontWeight: '600',
  },
})
