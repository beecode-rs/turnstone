import { type JSX } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { ActivityIndicator, List, Text } from 'react-native-paper'

import { type SearchMatch } from '#src/business/model/search-match'
import { HighlightText } from '#src/ui-component/search/highlight-text'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { fuzzyScoreUtil } from '#src/util/fuzzy-score-util'
import { remotePathUtil } from '#src/util/remote-path-util'

interface SearchResultListProps {
  hasSubmitted: boolean
  isCancelled: boolean
  isSearching: boolean
  matches: SearchMatch[]
  onPressMatch: (match: SearchMatch) => void
  query: string
  root: string
}

export const SearchResultList = (props: SearchResultListProps): JSX.Element => {
  const { md3Theme, navigationTheme } = useThemePreference()
  const { colors } = navigationTheme

  const resolveStatusSuffix = (): string => {
    if (props.isSearching) {
      return ', searching'
    }
    if (props.isCancelled) {
      return ', stopped'
    }

    return ''
  }

  const renderRowDescription = (match: SearchMatch): JSX.Element | null => {
    if (match.lineNumber === null) {
      return null
    }
    const lineIndices = fuzzyScoreUtil.matchIndices({ query: props.query, target: match.lineText ?? '' })

    return (
      <View style={styles.rowLine}>
        <Text style={[styles.rowLineNumber, { color: colors.primary }]}>{`L${String(match.lineNumber)}`}</Text>
        <Text numberOfLines={1} style={[styles.rowLineText, { color: colors.text }]}>
          <HighlightText indices={lineIndices} text={match.lineText ?? ''} />
        </Text>
      </View>
    )
  }

  const renderRow = (info: { item: SearchMatch }): JSX.Element => {
    const match = info.item
    const relativePath = remotePathUtil.toRelativePath({ path: match.path, root: props.root })
    const pathIndices = fuzzyScoreUtil.matchIndices({ query: props.query, target: relativePath })

    return (
      <List.Item
        description={renderRowDescription(match)}
        onPress={() => {
          props.onPressMatch(match)
        }}
        style={[styles.row, { borderColor: colors.border }]}
        title={<HighlightText indices={pathIndices} matchFontFamily="jetBrainsMonoBold" text={relativePath} />}
        titleStyle={{ fontFamily: 'jetBrainsMonoRegular' }}
      />
    )
  }

  const renderHeader = (): JSX.Element | null => {
    if (!props.hasSubmitted) {
      return null
    }

    return (
      <Text style={[styles.countText, { color: colors.text }]}>
        {`${String(props.matches.length)} matches${resolveStatusSuffix()}`}
      </Text>
    )
  }

  const renderEmpty = (): JSX.Element => {
    if (props.isSearching) {
      return (
        <View style={styles.empty}>
          <ActivityIndicator color={md3Theme.colors.primary} />
        </View>
      )
    }
    if (!props.hasSubmitted) {
      return (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.text }]}>Enter a pattern to search</Text>
        </View>
      )
    }

    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.text }]}>No matches</Text>
      </View>
    )
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={props.matches}
      keyExtractor={(match, index) => {
        return `${match.path}#${String(index)}`
      }}
      ListEmptyComponent={renderEmpty}
      ListHeaderComponent={renderHeader}
      renderItem={renderRow}
    />
  )
}

const styles = StyleSheet.create({
  countText: {
    fontSize: 13,
    opacity: 0.7,
    paddingBottom: 8,
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
    gap: 8,
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  row: {
    borderRadius: 8,
    borderWidth: 1,
  },
  rowLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  rowLineNumber: {
    flexShrink: 0,
    fontFamily: 'jetBrainsMonoRegular',
    fontSize: 12,
  },
  rowLineText: {
    flex: 1,
    fontSize: 13,
    opacity: 0.8,
  },
})
