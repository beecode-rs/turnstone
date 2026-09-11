import { MaterialCommunityIcons } from '@expo/vector-icons'
import { type JSX } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useFooter } from '#src/ui-component/footer-context'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

export type AppBottomBarProps = {
  branchName: string | null
  detailText?: string | null
}

export const AppBottomBar = (props: AppBottomBarProps): JSX.Element | null => {
  const { isFooterHidden } = useFooter()
  const { md3Theme } = useThemePreference()
  const insets = useSafeAreaInsets()
  const hasBranchName = props.branchName !== null && props.branchName !== ''
  const hasDetailText = (props.detailText ?? '') !== ''

  if (isFooterHidden) {
    return null
  }

  if (!hasBranchName && !hasDetailText) {
    return null
  }

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: md3Theme.colors.surfaceVariant, borderTopColor: md3Theme.colors.outlineVariant },
        { paddingBottom: insets.bottom },
      ]}
    >
      {hasDetailText && (
        <Text
          ellipsizeMode="head"
          numberOfLines={1}
          style={[styles.detailText, { color: md3Theme.colors.onSurfaceVariant }]}
        >
          {props.detailText}
        </Text>
      )}
      {hasBranchName && (
        <View style={styles.branch}>
          <MaterialCommunityIcons color={md3Theme.colors.onSurfaceVariant} name="source-branch" size={13} />
          <Text numberOfLines={1} style={[styles.branchName, { color: md3Theme.colors.onSurface }]}>
            {props.branchName}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
  },
  branch: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  branchName: {
    fontSize: 12,
  },
  detailText: {
    flex: 1,
    fontSize: 12,
  },
})
