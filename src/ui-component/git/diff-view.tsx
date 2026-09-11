import { type JSX, useMemo } from 'react'
import { type ColorValue, StyleSheet, Text, View } from 'react-native'

import { GitDiffChangeTypeMapper } from '#src/business/enum/git-diff-change-type-mapper-enum'
import { GitDiffLayoutMapper } from '#src/business/enum/git-diff-layout-mapper-enum'
import {
  type GitDiffChange,
  type GitDiffFilePatch,
  type GitDiffHunk,
  type GitDiffWordPart,
} from '#src/business/model/git-diff'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { type DiffSplitLine, type DiffSplitPair, diffSplitUtil } from '#src/util/diff-split-util'
import { gitDiffParseUtil } from '#src/util/git-diff-parse-util'

interface DiffViewProps {
  layout: GitDiffLayoutMapper
  patch: GitDiffFilePatch | null
}

interface DiffLineGroup {
  change: GitDiffChange
  wordParts: GitDiffWordPart[] | null
}

interface GroupWalkState {
  groups: DiffLineGroup[]
  pendingAdds: GitDiffChange[]
  pendingDels: GitDiffChange[]
}

interface SplitPairView {
  pair: DiffSplitPair
  wordParts: GitDiffWordPart[] | null
}

const toDisplayContent = (content: string): string => {
  return content.replace(/\n$/, '')
}

const toLineNumberText = (lineNumber: number | null): string => {
  return String(lineNumber ?? '')
}

const toSignText = (type: GitDiffChangeTypeMapper): string => {
  switch (type) {
    case GitDiffChangeTypeMapper.ADD: {
      return '+'
    }
    case GitDiffChangeTypeMapper.DEL: {
      return '-'
    }
    case GitDiffChangeTypeMapper.NORMAL: {
      return ' '
    }
    default: {
      throw new Error('Unsupported diff change type')
    }
  }
}

const toPlainGroup = (change: GitDiffChange): DiffLineGroup => {
  return { change, wordParts: null }
}

const buildPairedGroups = (params: { adds: GitDiffChange[]; dels: GitDiffChange[] }): DiffLineGroup[] => {
  const pairedCount = Math.min(params.dels.length, params.adds.length)
  const pairedWordParts = params.dels.slice(0, pairedCount).map((del, index): GitDiffWordPart[] => {
    return gitDiffParseUtil.computeWordDiff({
      newLine: toDisplayContent(params.adds[index].content),
      oldLine: toDisplayContent(del.content),
    })
  })
  const pairedDelGroups = params.dels.slice(0, pairedCount).map((del, index): DiffLineGroup => {
    return { change: del, wordParts: pairedWordParts[index] }
  })
  const unpairedDelGroups = params.dels.slice(pairedCount).map((del): DiffLineGroup => {
    return toPlainGroup(del)
  })
  const pairedAddGroups = params.adds.slice(0, pairedCount).map((add, index): DiffLineGroup => {
    return { change: add, wordParts: pairedWordParts[index] }
  })
  const unpairedAddGroups = params.adds.slice(pairedCount).map((add): DiffLineGroup => {
    return toPlainGroup(add)
  })

  return [...pairedDelGroups, ...unpairedDelGroups, ...pairedAddGroups, ...unpairedAddGroups]
}

const applyWalkChange = (params: { change: GitDiffChange; state: GroupWalkState }): GroupWalkState => {
  if (params.change.type === GitDiffChangeTypeMapper.DEL) {
    return {
      groups: params.state.groups,
      pendingAdds: params.state.pendingAdds,
      pendingDels: [...params.state.pendingDels, params.change],
    }
  }
  if (params.change.type === GitDiffChangeTypeMapper.ADD) {
    return {
      groups: params.state.groups,
      pendingAdds: [...params.state.pendingAdds, params.change],
      pendingDels: params.state.pendingDels,
    }
  }

  return {
    groups: [
      ...params.state.groups,
      ...buildPairedGroups({ adds: params.state.pendingAdds, dels: params.state.pendingDels }),
      toPlainGroup(params.change),
    ],
    pendingAdds: [],
    pendingDels: [],
  }
}

const buildHunkGroups = (hunk: GitDiffHunk): DiffLineGroup[] => {
  const walkState = hunk.changes.reduce<GroupWalkState>(
    (state, change): GroupWalkState => {
      return applyWalkChange({ change, state })
    },
    { groups: [], pendingAdds: [], pendingDels: [] },
  )

  return [...walkState.groups, ...buildPairedGroups({ adds: walkState.pendingAdds, dels: walkState.pendingDels })]
}

const resolvePairWordParts = (pair: DiffSplitPair): GitDiffWordPart[] | null => {
  if (pair.left === null || pair.right === null) {
    return null
  }
  if (pair.left.type !== GitDiffChangeTypeMapper.DEL || pair.right.type !== GitDiffChangeTypeMapper.ADD) {
    return null
  }

  return gitDiffParseUtil.computeWordDiff({
    newLine: toDisplayContent(pair.right.content),
    oldLine: toDisplayContent(pair.left.content),
  })
}

const buildPairViews = (hunk: GitDiffHunk): SplitPairView[] => {
  return diffSplitUtil.toAlignedPairs({ changes: hunk.changes }).map((pair): SplitPairView => {
    return { pair, wordParts: resolvePairWordParts(pair) }
  })
}

const isVisibleInLine = (params: { part: GitDiffWordPart; type: GitDiffChangeTypeMapper }): boolean => {
  if (params.type === GitDiffChangeTypeMapper.DEL) {
    return !params.part.isAdded
  }

  return !params.part.isRemoved
}

const isWordPartHighlighted = (params: { part: GitDiffWordPart; type: GitDiffChangeTypeMapper }): boolean => {
  if (params.type === GitDiffChangeTypeMapper.DEL) {
    return params.part.isRemoved
  }

  return params.part.isAdded
}

export const DiffView = (props: DiffViewProps): JSX.Element => {
  const { diffColors, navigationTheme } = useThemePreference()
  const { colors } = navigationTheme
  const hunksWithGroups = useMemo(() => {
    if (props.layout !== GitDiffLayoutMapper.UNIFIED) {
      return []
    }

    return (props.patch?.hunks ?? []).map((hunk) => {
      return { groups: buildHunkGroups(hunk), hunk }
    })
  }, [props.patch, props.layout])
  const hunksWithPairs = useMemo(() => {
    if (props.layout !== GitDiffLayoutMapper.SPLIT) {
      return []
    }

    return (props.patch?.hunks ?? []).map((hunk) => {
      return { hunk, pairs: buildPairViews(hunk) }
    })
  }, [props.patch, props.layout])

  const toChangeColor = (type: GitDiffChangeTypeMapper): ColorValue => {
    if (type === GitDiffChangeTypeMapper.ADD) {
      return diffColors.add
    }
    if (type === GitDiffChangeTypeMapper.DEL) {
      return diffColors.remove
    }

    return colors.text
  }

  const renderLineContent = (group: DiffLineGroup): JSX.Element => {
    if (group.wordParts === null) {
      return (
        <Text style={[styles.lineContent, { color: toChangeColor(group.change.type) }]}>
          {toDisplayContent(group.change.content)}
        </Text>
      )
    }

    return (
      <Text style={[styles.lineContent, { color: toChangeColor(group.change.type) }]}>
        {group.wordParts
          .filter((part) => {
            return isVisibleInLine({ part, type: group.change.type })
          })
          .map((part, partIndex) => {
            return (
              <Text
                key={`part-${String(partIndex)}`}
                style={[isWordPartHighlighted({ part, type: group.change.type }) && styles.wordPartHighlighted]}
              >
                {part.value}
              </Text>
            )
          })}
      </Text>
    )
  }

  const renderLineGroup = (params: { group: DiffLineGroup; groupIndex: number }): JSX.Element => {
    const { group } = params

    return (
      <View key={`line-${String(params.groupIndex)}`} style={styles.lineRow}>
        <Text style={[styles.lineNumber, { color: colors.text }]}>{toLineNumberText(group.change.oldLineNumber)}</Text>
        <Text style={[styles.lineNumber, { color: colors.text }]}>{toLineNumberText(group.change.newLineNumber)}</Text>
        <Text style={[styles.lineSign, { color: toChangeColor(group.change.type) }]}>
          {toSignText(group.change.type)}
        </Text>
        {renderLineContent(group)}
      </View>
    )
  }

  const resolveSplitLineNumber = (params: { line: DiffSplitLine; side: 'left' | 'right' }): number | null => {
    if (params.side === 'left') {
      return params.line.oldLineNumber
    }

    return params.line.newLineNumber
  }

  const renderSplitCell = (params: {
    line: DiffSplitLine | null
    side: 'left' | 'right'
    wordParts: GitDiffWordPart[] | null
  }): JSX.Element => {
    if (params.line === null) {
      return <View style={styles.splitCell} />
    }

    return (
      <View style={styles.splitCell}>
        <Text style={[styles.lineNumber, { color: colors.text }]}>
          {toLineNumberText(resolveSplitLineNumber({ line: params.line, side: params.side }))}
        </Text>
        <Text style={[styles.lineSign, { color: toChangeColor(params.line.type) }]}>
          {toSignText(params.line.type)}
        </Text>
        {renderLineContent({ change: params.line, wordParts: params.wordParts })}
      </View>
    )
  }

  const renderSplitPair = (params: { pairIndex: number; pairView: SplitPairView }): JSX.Element => {
    const { pairView } = params

    return (
      <View key={`pair-${String(params.pairIndex)}`} style={styles.splitRow}>
        {renderSplitCell({ line: pairView.pair.left, side: 'left', wordParts: pairView.wordParts })}
        <View style={[styles.splitDivider, { backgroundColor: colors.border }]} />
        {renderSplitCell({ line: pairView.pair.right, side: 'right', wordParts: pairView.wordParts })}
      </View>
    )
  }

  const renderTruncationNote = (): JSX.Element | null => {
    if (props.patch?.isTruncated !== true) {
      return null
    }

    return (
      <Text style={[styles.truncationNote, { color: colors.primary }]}>
        Diff is partial — only the loaded part of the file is shown
      </Text>
    )
  }

  if (props.patch === null) {
    return (
      <View style={styles.note}>
        <Text style={[styles.noteText, { color: colors.text }]}>No diff in this mode</Text>
      </View>
    )
  }
  if (props.patch.hunks.length === 0) {
    if (props.patch.isEmptyFile === true) {
      return (
        <View style={styles.note}>
          <Text style={[styles.noteText, { color: colors.text }]}>Empty file (nothing to diff)</Text>
        </View>
      )
    }

    return (
      <View style={styles.note}>
        <Text style={[styles.noteText, { color: colors.text }]}>Binary file (no textual diff)</Text>
      </View>
    )
  }

  if (props.layout === GitDiffLayoutMapper.SPLIT) {
    return (
      <View style={styles.container}>
        {renderTruncationNote()}
        {hunksWithPairs.map((hunkEntry, hunkIndex) => {
          return (
            <View key={`hunk-${String(hunkIndex)}`} style={styles.hunk}>
              <Text style={[styles.hunkHeader, { color: colors.primary }]}>
                {toDisplayContent(hunkEntry.hunk.content)}
              </Text>
              {hunkEntry.pairs.map((pairView, pairIndex) => {
                return renderSplitPair({ pairIndex, pairView })
              })}
            </View>
          )
        })}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {renderTruncationNote()}
      {hunksWithGroups.map((hunkEntry, hunkIndex) => {
        return (
          <View key={`hunk-${String(hunkIndex)}`} style={styles.hunk}>
            <Text style={[styles.hunkHeader, { color: colors.primary }]}>
              {toDisplayContent(hunkEntry.hunk.content)}
            </Text>
            {hunkEntry.groups.map((group, groupIndex) => {
              return renderLineGroup({ group, groupIndex })
            })}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  hunk: {
    marginBottom: 8,
  },
  hunkHeader: {
    fontFamily: 'jetBrainsMonoRegular',
    fontSize: 11,
    opacity: 0.8,
    paddingVertical: 2,
  },
  lineContent: {
    flex: 1,
    flexWrap: 'wrap',
    fontFamily: 'jetBrainsMonoRegular',
    fontSize: 12,
  },
  lineNumber: {
    fontFamily: 'jetBrainsMonoRegular',
    fontSize: 11,
    minWidth: 36,
    opacity: 0.55,
    textAlign: 'right',
  },
  lineRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  lineSign: {
    fontFamily: 'jetBrainsMonoRegular',
    fontSize: 12,
    minWidth: 14,
  },
  note: {
    paddingBottom: 8,
    paddingTop: 4,
  },
  noteText: {
    fontFamily: 'jetBrainsMonoRegular',
    fontSize: 12,
    opacity: 0.7,
  },
  splitCell: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
  },
  splitDivider: {
    width: StyleSheet.hairlineWidth,
  },
  splitRow: {
    flexDirection: 'row',
  },
  truncationNote: {
    fontFamily: 'jetBrainsMonoRegular',
    fontSize: 11,
    opacity: 0.8,
    paddingVertical: 2,
  },
  wordPartHighlighted: {
    fontFamily: 'jetBrainsMonoBold',
    textDecorationLine: 'underline',
  },
})
