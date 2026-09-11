import { type JSX } from 'react'
import { StyleSheet, View } from 'react-native'
import { Badge } from 'react-native-paper'

import { type GitStatusBranch } from '#src/business/model/git-status'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

interface BranchHeaderProps {
  branch: GitStatusBranch | null
}

export const BranchHeader = (props: BranchHeaderProps): JSX.Element | null => {
  const { md3Theme } = useThemePreference()
  const ahead = props.branch?.ahead ?? 0
  const behind = props.branch?.behind ?? 0

  if (ahead <= 0 && behind <= 0) {
    return null
  }

  return (
    <View style={styles.badges}>
      <Badge
        style={[styles.badge, { backgroundColor: md3Theme.colors.primary, color: md3Theme.colors.onPrimary }]}
        visible={ahead > 0}
      >
        {ahead}
      </Badge>
      <Badge style={[styles.badge, { backgroundColor: md3Theme.colors.error }]} visible={behind > 0}>
        {behind}
      </Badge>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    marginLeft: 12,
  },
  badges: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
})
