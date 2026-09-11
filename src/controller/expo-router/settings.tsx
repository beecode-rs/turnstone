import { router } from 'expo-router'
import { type JSX } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CollapsibleTopBar } from '#src/ui-component/collapsible-top-bar'
import { SettingsScreen } from '#src/ui-component/settings/settings-screen'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

export const SettingsController = (): JSX.Element => {
  const { navigationTheme } = useThemePreference()

  const handleBack = (): void => {
    router.back()
  }

  const handlePressAbout = (): void => {
    router.navigate({ pathname: '/about' })
  }

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.safeArea, { backgroundColor: navigationTheme.colors.background }]}
    >
      <CollapsibleTopBar onPressAbout={handlePressAbout} onPressBack={handleBack} title="Settings" />
      <SettingsScreen />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
})
