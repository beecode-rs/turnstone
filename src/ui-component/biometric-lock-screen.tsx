import { type JSX } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'

import { useThemePreference } from '#src/ui-component/theme/theme-context'

export const BiometricLockScreen = (props: {
  authFailureMessage: string | null
  isAuthInProgress: boolean
  onRetry: () => void
}): JSX.Element => {
  const { authFailureMessage, isAuthInProgress, onRetry } = props
  const { md3Theme } = useThemePreference()

  return (
    <View style={[styles.screen, { backgroundColor: md3Theme.colors.background }]}>
      <Text style={{ color: md3Theme.colors.onSurface }} variant="titleLarge">
        Turnstone is locked
      </Text>
      <Text style={[styles.hint, { color: md3Theme.colors.onSurfaceVariant }]} variant="bodyMedium">
        Unlock with your fingerprint or face to continue
      </Text>
      {authFailureMessage !== null && (
        <Text style={{ color: md3Theme.colors.error }} variant="bodySmall">
          {authFailureMessage}
        </Text>
      )}
      <Button
        disabled={isAuthInProgress}
        icon="lock-open"
        mode="contained"
        onPress={onRetry}
        style={styles.unlockButton}
      >
        Unlock
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  hint: {
    textAlign: 'center',
  },
  screen: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    padding: 32,
  },
  unlockButton: {
    marginTop: 16,
  },
})
