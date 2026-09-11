import { type JSX } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import { useThemePreference } from '#src/ui-component/theme/theme-context'

export type AppIdentityTitleProps = {
  appName: string
}

export const AppIdentityTitle = (props: AppIdentityTitleProps): JSX.Element => {
  const { md3Theme } = useThemePreference()

  return (
    <View style={styles.row}>
      <Image resizeMode="contain" source={require('@/assets/images/adaptive-icon.png')} style={styles.icon} />
      <Text style={{ color: md3Theme.colors.onSurface }} variant="titleLarge">
        {props.appName}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  icon: {
    height: 44,
    width: 44,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginLeft: 12,
  },
})
