import { type JSX } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useThemePreference } from '#src/ui-component/theme/theme-context'

interface LoadMoreFooterProps {
  formattedLoadedSize: string
  formattedTotalSize: string
  hasMore: boolean
  isCapReached: boolean
  isExplicitLoadRequired: boolean
  isLoadingMore: boolean
  onPressLoadMore: () => void
}

export const LoadMoreFooter = (props: LoadMoreFooterProps): JSX.Element | null => {
  const { colors } = useThemePreference().navigationTheme

  if (props.isLoadingMore) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={String(colors.primary)} />
        <Text style={[styles.hint, { color: colors.text }]}>Loading more…</Text>
      </View>
    )
  }

  if (props.isCapReached) {
    return (
      <View style={styles.container}>
        <Text style={[styles.hint, { color: colors.text }]}>On-demand limit reached (2.0 MB)</Text>
      </View>
    )
  }

  if (props.isExplicitLoadRequired) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={props.onPressLoadMore} style={[styles.button, { borderColor: colors.primary }]}>
          <Text style={[styles.buttonLabel, { color: colors.primary }]}>
            {`Load more · ${props.formattedLoadedSize} of ${props.formattedTotalSize}`}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (props.hasMore) {
    return (
      <View style={styles.container}>
        <Text style={[styles.hint, { color: colors.text }]}>Scroll to load more</Text>
      </View>
    )
  }

  return null
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
    includeFontPadding: false,
    lineHeight: 14,
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  hint: {
    fontSize: 13,
    includeFontPadding: false,
    lineHeight: 13,
    opacity: 0.6,
  },
})
