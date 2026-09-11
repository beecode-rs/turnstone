import { type JSX } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { ActivityIndicator, Badge } from 'react-native-paper'

import { type GitDiffLayoutMapper } from '#src/business/enum/git-diff-layout-mapper-enum'
import { GitStatusChangeTypeMapper } from '#src/business/enum/git-status-change-type-mapper-enum'
import { type GitScreenRow } from '#src/business/model/git-screen'
import { type GitStatusChange } from '#src/business/model/git-status'
import { DiffView } from '#src/ui-component/git/diff-view'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

const toTypeBadge = (change: GitStatusChange): string => {
  switch (change.type) {
    case GitStatusChangeTypeMapper.CHANGED: {
      return `${change.indexStatus ?? ''}${change.worktreeStatus ?? ''}`.trim()
    }
    case GitStatusChangeTypeMapper.IGNORED: {
      return '!'
    }
    case GitStatusChangeTypeMapper.RENAMED: {
      return 'R'
    }
    case GitStatusChangeTypeMapper.UNMERGED: {
      return 'U'
    }
    case GitStatusChangeTypeMapper.UNTRACKED: {
      return '?'
    }
    default: {
      throw new Error('Unsupported change type')
    }
  }
}

const toRowPath = (change: GitStatusChange): string => {
  if (change.origPath !== null) {
    return `${change.origPath} → ${change.path}`
  }

  return change.path
}

interface ChangedFileListProps {
  diffLayout: GitDiffLayoutMapper
  isLoading: boolean
  onPressRow: (row: GitScreenRow) => void
  rows: GitScreenRow[]
}

export const ChangedFileList = (props: ChangedFileListProps): JSX.Element => {
  const { md3Theme, navigationTheme } = useThemePreference()
  const { colors } = navigationTheme

  const renderChevron = (row: GitScreenRow): string => {
    if (row.isExpanded) {
      return '▾'
    }

    return '▸'
  }

  const renderPatchArea = (row: GitScreenRow): JSX.Element => {
    if (!row.isPatchLoaded) {
      return <ActivityIndicator color={md3Theme.colors.primary} style={styles.patchSpinner} />
    }

    return <DiffView layout={props.diffLayout} patch={row.patch} />
  }

  const renderRow = (info: { item: GitScreenRow }): JSX.Element => {
    const row = info.item

    return (
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => {
            props.onPressRow(row)
          }}
          style={styles.rowHeader}
        >
          <Badge
            style={[styles.rowType, { backgroundColor: md3Theme.colors.primary, color: md3Theme.colors.onPrimary }]}
          >
            {toTypeBadge(row.change)}
          </Badge>
          <Text numberOfLines={1} style={[styles.rowPath, { color: colors.text }]}>
            {toRowPath(row.change)}
          </Text>
          <Text style={[styles.chevron, { color: colors.text }]}>{renderChevron(row)}</Text>
        </Pressable>
        {row.isExpanded && <View style={styles.rowPatch}>{renderPatchArea(row)}</View>}
      </View>
    )
  }

  const renderEmpty = (): JSX.Element => {
    if (props.isLoading) {
      return (
        <View style={styles.empty}>
          <ActivityIndicator color={md3Theme.colors.primary} />
        </View>
      )
    }

    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.text }]}>No changes</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={props.rows}
        keyExtractor={(row) => {
          return row.rowKey
        }}
        ListEmptyComponent={renderEmpty}
        renderItem={renderRow}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  chevron: {
    fontFamily: 'jetBrainsMonoRegular',
    fontSize: 12,
    marginLeft: 8,
    opacity: 0.6,
  },
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
  patchSpinner: {
    padding: 12,
  },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 10,
  },
  rowPatch: {
    paddingBottom: 8,
  },
  rowPath: {
    flex: 1,
    flexWrap: 'wrap',
    fontFamily: 'jetBrainsMonoRegular',
    fontSize: 13,
    marginHorizontal: 8,
  },
  rowType: {
    fontFamily: 'jetBrainsMonoBold',
    fontSize: 12,
    minWidth: 24,
  },
})
