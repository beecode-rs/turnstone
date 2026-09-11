import { type JSX, useEffect, useState } from 'react'
import { Modal, ScrollView, StyleSheet, View } from 'react-native'
import { Button, Text, TextInput } from 'react-native-paper'

import { type HostConfig } from '#src/business/model/host-config'
import { type ProjectConfig } from '#src/business/model/project-config'
import { type ProjectDraft } from '#src/business/model/project-draft'
import { type ServerDraft } from '#src/business/model/server-draft'
import { IconButton } from '#src/ui-component/icon-button'
import { KeyboardAvoidingArea } from '#src/ui-component/keyboard-avoiding-area'
import { FolderBrowserModal } from '#src/ui-component/server/folder-browser-modal'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { remotePathUtil } from '#src/util/remote-path-util'

const EMPTY_PATH = '/'

interface ProjectFormState {
  nameText: string
  pathText: string
}

interface ProjectFormProps {
  editingProject: ProjectConfig | undefined
  hostConfig: HostConfig | undefined
  isVisible: boolean
  onCancel: () => void
  onSubmit: (draft: ProjectDraft) => void
  prefillProject: ProjectConfig | undefined
}

const EMPTY_FORM_STATE: ProjectFormState = {
  nameText: '',
  pathText: '',
}

export const ProjectForm = (props: ProjectFormProps): JSX.Element => {
  const { md3Theme } = useThemePreference()
  const [browseDraft, setBrowseDraft] = useState<ServerDraft | undefined>(undefined)
  const [formState, setFormState] = useState<ProjectFormState>(EMPTY_FORM_STATE)

  useEffect(() => {
    if (!props.isVisible) {
      return
    }
    const initialProject = props.editingProject ?? props.prefillProject
    setFormState({
      nameText: initialProject?.name ?? '',
      pathText: initialProject?.path ?? props.hostConfig?.rootPath ?? '',
    })
  }, [props.editingProject, props.isVisible, props.prefillProject])

  const formTitle = (): string => {
    if (props.editingProject) {
      return 'Edit Project'
    }
    if (props.prefillProject) {
      return 'Clone Project'
    }

    return 'Add Project'
  }

  const updateField = (patch: Partial<ProjectFormState>): void => {
    setFormState((current) => {
      return { ...current, ...patch }
    })
  }

  const buildBrowseDraft = (): ServerDraft | undefined => {
    if (!props.hostConfig) {
      return undefined
    }

    return {
      authMethod: props.hostConfig.authMethod,
      host: props.hostConfig.host,
      label: props.hostConfig.label,
      port: props.hostConfig.port,
      username: props.hostConfig.username,
    }
  }

  const handleBrowsePress = (): void => {
    setBrowseDraft(buildBrowseDraft())
  }

  const closeBrowse = (): void => {
    setBrowseDraft(undefined)
  }

  const handleBrowseSelect = (path: string): void => {
    setFormState((current) => {
      if (current.nameText.trim() !== '') {
        return { ...current, pathText: path }
      }
      const folderName = remotePathUtil.toParts({ path }).at(-1)
      if (folderName === undefined) {
        return { ...current, pathText: path }
      }

      return { ...current, nameText: folderName, pathText: path }
    })
    closeBrowse()
  }

  const resolveName = (path: string): string => {
    const trimmedName = formState.nameText.trim()
    if (trimmedName !== '') {
      return trimmedName
    }

    return remotePathUtil.toParts({ path }).at(-1) ?? props.hostConfig?.label ?? 'Project'
  }

  const handleSubmit = (): void => {
    props.onSubmit({
      name: resolveName(remotePathUtil.normalizeRootPath({ path: formState.pathText || EMPTY_PATH })),
      path: remotePathUtil.normalizeRootPath({ path: formState.pathText || EMPTY_PATH }),
    })
  }

  return (
    <Modal animationType="slide" onRequestClose={props.onCancel} visible={props.isVisible}>
      <KeyboardAvoidingArea style={styles.modalScroll}>
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          style={[styles.modalScroll, { backgroundColor: md3Theme.colors.background }]}
        >
          <Text style={styles.formTitle} variant="headlineMedium">
            {formTitle()}
          </Text>

          <TextInput
            label="Name"
            mode="outlined"
            onChangeText={(text) => {
              updateField({ nameText: text })
            }}
            placeholder="My project"
            value={formState.nameText}
          />

          <View style={styles.pathRow}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              label="Path"
              mode="outlined"
              onChangeText={(text) => {
                updateField({ pathText: text })
              }}
              placeholder={EMPTY_PATH}
              style={styles.pathInput}
              value={formState.pathText}
            />
            <IconButton
              icon="folder-outline"
              iconColor={md3Theme.colors.onSurfaceVariant}
              onPress={handleBrowsePress}
              tip="Browse remote folders"
            />
          </View>

          <View style={styles.buttonRow}>
            <Button mode="outlined" onPress={props.onCancel} style={styles.rowButton}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleSubmit} style={styles.rowButton}>
              Save
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingArea>
      <FolderBrowserModal
        draft={browseDraft}
        existingConfig={props.hostConfig}
        initialPath={formState.pathText || (props.hostConfig?.rootPath ?? EMPTY_PATH)}
        isVisible={browseDraft !== undefined}
        onCancel={closeBrowse}
        onSelect={handleBrowseSelect}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  formContent: {
    gap: 12,
    paddingBottom: 48,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  formTitle: {
    fontWeight: '700',
  },
  modalScroll: {
    flex: 1,
  },
  pathInput: {
    flex: 1,
  },
  pathRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  rowButton: {
    flex: 1,
  },
})
