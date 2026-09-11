import { type JSX } from 'react'
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import { useThemePreference } from '#src/ui-component/theme/theme-context'

const BEECODE_URL = 'https://beecode.rs'

export type AboutScreenProps = {
  appName: string
  appVersion: string
}

export const AboutScreen = (props: AboutScreenProps): JSX.Element => {
  const { md3Theme } = useThemePreference()

  const handlePressBeecode = (): void => {
    void Linking.openURL(BEECODE_URL)
  }

  return (
    <View style={[styles.screen, { backgroundColor: md3Theme.colors.background }]}>
      <Image resizeMode="contain" source={require('@/assets/images/icon.png')} style={styles.icon} />
      <Text style={[styles.appName, { color: md3Theme.colors.onSurface }]} variant="headlineMedium">
        {props.appName}
      </Text>
      <Text style={[styles.version, { color: md3Theme.colors.onSurfaceVariant }]} variant="bodyMedium">
        Version {props.appVersion}
      </Text>
      <Text style={[styles.description, { color: md3Theme.colors.onSurfaceVariant }]} variant="bodyMedium">
        Browse, read, and inspect files on remote servers over SSH.
      </Text>
      <Pressable
        accessibilityLabel="Visit beecode.rs"
        accessibilityRole="link"
        onPress={handlePressBeecode}
        style={styles.madeBy}
      >
        <Image source={require('@/assets/images/beecode-logo.png')} style={styles.madeByLogo} />
        <Text style={[styles.madeByText, { color: md3Theme.colors.onSurfaceVariant }]} variant="bodyMedium">
          Made by beecode
        </Text>
        <Text style={[styles.madeByText, { color: md3Theme.colors.primary }]} variant="bodyMedium">
          beecode.rs
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  appName: {
    marginTop: 32,
  },
  description: {
    marginTop: 24,
    textAlign: 'center',
  },
  icon: {
    height: 176,
    width: 176,
  },
  madeBy: {
    alignItems: 'center',
    gap: 4,
    marginTop: 32,
  },
  madeByLogo: {
    borderRadius: 10,
    height: 48,
    overflow: 'hidden',
    width: 48,
  },
  madeByText: {
    textAlign: 'center',
  },
  screen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  version: {
    marginTop: 8,
  },
})
