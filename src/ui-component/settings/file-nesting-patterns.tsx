import { type JSX, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import { type FileNestingPattern } from '#src/business/model/file-nesting-preference'
import { ConfirmModal } from '#src/ui-component/confirm-modal'
import { IconButton } from '#src/ui-component/icon-button'
import { FileNestingPatternDialog } from '#src/ui-component/settings/file-nesting-pattern-dialog'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { useFileNesting } from '#src/ui-component/tree/file-nesting-context'

interface PatternDialogState {
  isVisible: boolean
  patternIndex: number | null
}

export const FileNestingPatterns = (): JSX.Element => {
  const { md3Theme } = useThemePreference()
  const { fileNesting, saveFileNesting } = useFileNesting()
  const [dialog, setDialog] = useState<PatternDialogState>({ isVisible: false, patternIndex: null })
  const [deletePatternIndex, setDeletePatternIndex] = useState<number | null>(null)

  const resolveEditingPattern = (): FileNestingPattern | null => {
    if (dialog.patternIndex === null) {
      return null
    }

    return fileNesting.patterns[dialog.patternIndex] ?? null
  }

  const resolveNextPatterns = (pattern: FileNestingPattern): FileNestingPattern[] => {
    if (dialog.patternIndex === null) {
      return [...fileNesting.patterns, pattern]
    }

    return fileNesting.patterns.map((existing, index) => {
      if (index === dialog.patternIndex) {
        return pattern
      }

      return existing
    })
  }

  const openAddDialog = (): void => {
    setDialog({ isVisible: true, patternIndex: null })
  }

  const openEditDialog = (patternIndex: number): void => {
    setDialog({ isVisible: true, patternIndex })
  }

  const closeDialog = (): void => {
    setDialog({ isVisible: false, patternIndex: null })
  }

  const handleSavePattern = (pattern: FileNestingPattern): void => {
    void saveFileNesting({ ...fileNesting, patterns: resolveNextPatterns(pattern) })
    closeDialog()
  }

  const resolveDeletePatternParent = (): string => {
    if (deletePatternIndex === null) {
      return ''
    }

    return fileNesting.patterns[deletePatternIndex]?.parent ?? ''
  }

  const handleDeletePress = (patternIndex: number): void => {
    setDeletePatternIndex(patternIndex)
  }

  const handleDeleteCancel = (): void => {
    setDeletePatternIndex(null)
  }

  const handleDeleteConfirm = (): void => {
    if (deletePatternIndex === null) {
      return
    }

    const nextPatterns = fileNesting.patterns.filter((_, index) => {
      return index !== deletePatternIndex
    })

    void saveFileNesting({ ...fileNesting, patterns: nextPatterns })
    setDeletePatternIndex(null)
  }

  return (
    <View style={styles.patterns}>
      {fileNesting.patterns.map((pattern, index) => {
        return (
          <View key={`${String(index)}-${pattern.parent}`} style={styles.patternRow}>
            <View style={styles.patternTextColumn}>
              <Text style={{ color: md3Theme.colors.onSurface }} variant="bodyLarge">
                {pattern.parent}
              </Text>
              <Text style={{ color: md3Theme.colors.onSurfaceVariant }} variant="bodySmall">
                {pattern.children.join(', ')}
              </Text>
            </View>
            <IconButton
              icon="pencil"
              onPress={() => {
                openEditDialog(index)
              }}
              tip="Edit pattern"
            />
            <IconButton
              icon="trash-can-outline"
              iconColor={md3Theme.colors.error}
              onPress={() => {
                handleDeletePress(index)
              }}
              tip="Delete pattern"
            />
          </View>
        )
      })}
      <View style={styles.patternRow}>
        <View style={styles.patternTextColumn}>
          <Text style={{ color: md3Theme.colors.onSurfaceVariant }} variant="bodyLarge">
            Add pattern
          </Text>
        </View>
        <IconButton icon="plus" onPress={openAddDialog} tip="Add pattern" />
      </View>
      <FileNestingPatternDialog
        isVisible={dialog.isVisible}
        onCancel={closeDialog}
        onSave={handleSavePattern}
        pattern={resolveEditingPattern()}
      />
      <ConfirmModal
        confirmLabel="Delete"
        isDestructive
        isVisible={deletePatternIndex !== null}
        message={`Delete pattern "${resolveDeletePatternParent()}"? Its children will no longer be nested.`}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete pattern"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  patternRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 48,
  },
  patterns: {
    gap: 4,
  },
  patternTextColumn: {
    flex: 1,
    gap: 2,
  },
})
