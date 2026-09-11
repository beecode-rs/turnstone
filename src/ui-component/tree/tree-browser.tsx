import { type JSX, useCallback } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'

import { type GitTreeStatusKindMapper } from '#src/business/enum/git-tree-status-kind-mapper-enum'
import { type TreeRowItem } from '#src/business/model/tree-browser'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { useTreeDensity } from '#src/ui-component/tree/tree-density-context'
import { TREE_DENSITY_METRICS } from '#src/ui-component/tree/tree-density-metrics'
import { TreeRow } from '#src/ui-component/tree/tree-row'

interface TreeBrowserProps {
  gitStatusByPath: Record<string, GitTreeStatusKindMapper>
  isGitRepo: boolean
  isLoading: boolean
  isRefreshing: boolean
  onOpenFile: (row: TreeRowItem) => void
  onPressRow: (row: TreeRowItem) => void
  onRefresh: () => void
  onViewDiffFile: (row: TreeRowItem) => void
  rows: TreeRowItem[]
  selectedPath: string | null
}

export const TreeBrowser = (props: TreeBrowserProps): JSX.Element => {
  const { navigationTheme } = useThemePreference()
  const { colors } = navigationTheme
  const { density } = useTreeDensity()
  const rowHeight = TREE_DENSITY_METRICS[density].rowHeight

  const getItemLayout = useCallback(
    (data: ArrayLike<TreeRowItem> | null | undefined, index: number) => {
      return { index, length: rowHeight, offset: rowHeight * index }
    },
    [rowHeight],
  )

  const renderRow = (info: { item: TreeRowItem }): JSX.Element => {
    const row = info.item

    return (
      <TreeRow
        gitStatus={props.gitStatusByPath[row.path]}
        isDiffAvailable={props.isGitRepo && !row.entry.isDir}
        isSelected={row.path === props.selectedPath}
        onOpen={() => {
          props.onOpenFile(row)
        }}
        onPress={() => {
          props.onPressRow(row)
        }}
        onViewDiff={() => {
          props.onViewDiffFile(row)
        }}
        row={row}
      />
    )
  }

  const renderEmpty = (): JSX.Element => {
    if (props.isLoading) {
      return (
        <View style={styles.empty}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )
    }

    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.text }]}>Empty directory</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={props.rows}
        getItemLayout={getItemLayout}
        keyExtractor={(row) => {
          return row.path
        }}
        ListEmptyComponent={renderEmpty}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl
            colors={[String(colors.primary)]}
            onRefresh={props.onRefresh}
            refreshing={props.isRefreshing}
            tintColor={colors.primary}
          />
        }
        renderItem={renderRow}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.7,
  },
  listContent: {
    paddingBottom: 24,
  },
})
