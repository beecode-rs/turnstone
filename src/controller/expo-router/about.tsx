import Constants from 'expo-constants'
import { router } from 'expo-router'
import { type JSX } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AboutScreen } from '#src/ui-component/about/about-screen'
import { CollapsibleTopBar } from '#src/ui-component/collapsible-top-bar'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

export const AboutController = (): JSX.Element => {
  const { navigationTheme } = useThemePreference()
  const appName = Constants.expoConfig?.name ?? 'Turnstone'
  const appVersion = Constants.expoConfig?.version ?? 'unknown'

  const handleBack = (): void => {
    router.back()
  }

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.safeArea, { backgroundColor: navigationTheme.colors.background }]}
    >
      <CollapsibleTopBar onPressBack={handleBack} title="About" />
      <AboutScreen appName={appName} appVersion={appVersion} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
})
