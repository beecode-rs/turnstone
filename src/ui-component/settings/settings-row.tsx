import { type JSX, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import { useThemePreference } from '#src/ui-component/theme/theme-context'

export const SettingsRow = (props: { control: ReactNode; description?: string; label: string }): JSX.Element => {
  const { md3Theme } = useThemePreference()

  return (
    <View style={styles.row}>
      <View style={styles.textColumn}>
        <Text style={{ color: md3Theme.colors.onSurface }} variant="bodyLarge">
          {props.label}
        </Text>
        {props.description !== undefined && (
          <Text style={{ color: md3Theme.colors.onSurfaceVariant }} variant="bodySmall">
            {props.description}
          </Text>
        )}
      </View>
      {props.control}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    minHeight: 48,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
})
