import { type JSX, useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper'

import { type FileNestingPattern } from '#src/business/model/file-nesting-preference'
import { FileNestingMatchService } from '#src/business/service/file-nesting-match-service'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

const fileNestingMatchService = new FileNestingMatchService()

const toChildPatterns = (childrenText: string): string[] => {
  return [
    ...new Set(
      childrenText
        .split(',')
        .map((child) => {
          return child.trim()
        })
        .filter((child) => {
          return child !== ''
        }),
    ),
  ]
}

interface FileNestingPatternDialogProps {
  isVisible: boolean
  onCancel: () => void
  onSave: (pattern: FileNestingPattern) => void
  pattern: FileNestingPattern | null
}

export const FileNestingPatternDialog = (props: FileNestingPatternDialogProps): JSX.Element => {
  const { md3Theme } = useThemePreference()
  const [parentText, setParentText] = useState('')
  const [childrenText, setChildrenText] = useState('')

  useEffect(() => {
    if (!props.isVisible) {
      return
    }
    setParentText(props.pattern?.parent ?? '')
    setChildrenText(props.pattern?.children.join(', ') ?? '')
  }, [props.isVisible, props.pattern])

  const draftPattern: FileNestingPattern = {
    children: toChildPatterns(childrenText),
    parent: parentText.trim(),
  }
  const isDraftValid = draftPattern.parent !== '' && draftPattern.children.length > 0

  const resolveTitle = (): string => {
    if (props.pattern === null) {
      return 'Add nesting pattern'
    }

    return 'Edit nesting pattern'
  }

  const resolvePreviewText = (): string => {
    if (!isDraftValid) {
      return ''
    }
    const preview = fileNestingMatchService.resolvePatternPreview({ pattern: draftPattern })

    return `${preview.parentName} → ${preview.childNames.join(', ')}`
  }

  const handleSave = (): void => {
    props.onSave(draftPattern)
  }

  const previewText = resolvePreviewText()

  return (
    <Portal>
      <Dialog onDismiss={props.onCancel} visible={props.isVisible}>
        <Dialog.Title>{resolveTitle()}</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Parent pattern"
            mode="outlined"
            onChangeText={(nextValue) => {
              setParentText(nextValue)
            }}
            placeholder="*.ts"
            value={parentText}
          />
          <TextInput
            label="Child patterns (comma-separated)"
            mode="outlined"
            onChangeText={(nextValue) => {
              setChildrenText(nextValue)
            }}
            placeholder="${capture}.test.ts, ${capture}.js, tsconfig.*.json"
            style={styles.childrenInput}
            value={childrenText}
          />
          {previewText !== '' && (
            <Text style={[styles.preview, { color: md3Theme.colors.onSurfaceVariant }]} variant="bodySmall">
              {previewText}
            </Text>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={props.onCancel}>Cancel</Button>
          <Button disabled={!isDraftValid} onPress={handleSave}>
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}

const styles = StyleSheet.create({
  childrenInput: {
    marginTop: 4,
  },
  preview: {
    marginTop: 8,
  },
})
