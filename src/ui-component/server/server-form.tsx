import { type JSX, useEffect, useState } from 'react'
import { Modal, ScrollView, StyleSheet, View } from 'react-native'
import { Button, HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper'

import { HostAuthMethodMapper } from '#src/business/enum/host-auth-method-mapper-enum'
import { type DeviceKeyPublicInfo } from '#src/business/model/device-key'
import { type HostConfig } from '#src/business/model/host-config'
import { type ServerDraft } from '#src/business/model/server-draft'
import { deviceKeyUseCase } from '#src/business/use-case/device-key-use-case'
import { IconButton } from '#src/ui-component/icon-button'
import { KeyboardAvoidingArea } from '#src/ui-component/keyboard-avoiding-area'
import { DeviceKeyInstallModal } from '#src/ui-component/server/device-key-install-modal'
import { FolderBrowserModal } from '#src/ui-component/server/folder-browser-modal'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { remotePathUtil } from '#src/util/remote-path-util'

const DEFAULT_PORT = 22
const EMPTY_PATH = '/'

interface ServerFormState {
  host: string
  label: string
  passphrase: string
  password: string
  portText: string
  privateKey: string
  rootPathText: string
  username: string
}

export type ServerFormStatus =
  { kind: 'failed'; message: string } | { kind: 'idle' } | { kind: 'succeeded' } | { kind: 'testing' }

interface ServerFormProps {
  editingConfig: HostConfig | undefined
  isVisible: boolean
  onCancel: () => void
  onInstallEnd: () => void
  onInstallStart: (draft: ServerDraft) => void
  onSubmit: (draft: ServerDraft) => void
  onTest: (draft: ServerDraft) => void
  prefillConfig: HostConfig | undefined
  status: ServerFormStatus
}

const AUTH_METHOD_BUTTONS = [
  { label: 'Password', value: HostAuthMethodMapper.PASSWORD },
  { label: 'Private Key', value: HostAuthMethodMapper.KEY },
  { label: 'Device Key', value: HostAuthMethodMapper.DEVICE_KEY },
]

const EMPTY_FORM_STATE: ServerFormState = {
  host: '',
  label: '',
  passphrase: '',
  password: '',
  portText: '',
  privateKey: '',
  rootPathText: '',
  username: '',
}

export const ServerForm = (props: ServerFormProps): JSX.Element => {
  const { md3Theme } = useThemePreference()
  const [authMethod, setAuthMethod] = useState<HostAuthMethodMapper>(HostAuthMethodMapper.PASSWORD)
  const [browseDraft, setBrowseDraft] = useState<ServerDraft | undefined>(undefined)
  const [deviceKey, setDeviceKey] = useState<DeviceKeyPublicInfo | null>(null)
  const [deviceKeyError, setDeviceKeyError] = useState<string | null>(null)
  const [formState, setFormState] = useState<ServerFormState>(EMPTY_FORM_STATE)
  const [installDraft, setInstallDraft] = useState<ServerDraft | undefined>(undefined)

  const isDeviceKeyAuth = authMethod === HostAuthMethodMapper.DEVICE_KEY
  const isKeyAuth = authMethod === HostAuthMethodMapper.KEY
  const isPasswordAuth = authMethod === HostAuthMethodMapper.PASSWORD

  useEffect(() => {
    if (!props.isVisible) {
      return
    }
    const initialConfig = props.editingConfig ?? props.prefillConfig
    setAuthMethod(initialConfig?.authMethod ?? HostAuthMethodMapper.PASSWORD)
    setFormState({
      host: initialConfig?.host ?? '',
      label: initialConfig?.label ?? '',
      passphrase: '',
      password: '',
      portText: initialConfig?.port.toString() ?? '',
      privateKey: '',
      rootPathText: initialConfig?.rootPath ?? '',
      username: initialConfig?.username ?? '',
    })
  }, [props.editingConfig, props.isVisible, props.prefillConfig])

  useEffect(() => {
    if (!props.isVisible || !isDeviceKeyAuth) {
      return
    }
    const cancelState = { isCancelled: false }
    const loadDeviceKey = async (): Promise<void> => {
      try {
        const keyInfo = await deviceKeyUseCase.find()
        if (cancelState.isCancelled) {
          return
        }
        setDeviceKey(keyInfo)
        setDeviceKeyError(null)
      } catch (error) {
        if (cancelState.isCancelled) {
          return
        }
        setDeviceKeyError(String(error))
      }
    }
    void loadDeviceKey()

    return () => {
      cancelState.isCancelled = true
    }
  }, [isDeviceKeyAuth, props.isVisible])

  const formTitle = (): string => {
    if (props.editingConfig) {
      return 'Edit Server'
    }
    if (props.prefillConfig) {
      return 'Clone Server'
    }

    return 'Add Server'
  }

  const passwordPlaceholder = (): string => {
    if (props.editingConfig) {
      return 'Leave blank to keep the saved password'
    }

    return 'Enter the server password'
  }

  const updateField = (patch: Partial<ServerFormState>): void => {
    setFormState((current) => {
      return { ...current, ...patch }
    })
  }

  const parsePort = (): number | undefined => {
    if (!formState.portText.trim()) {
      return DEFAULT_PORT
    }
    const parsedPort = Number.parseInt(formState.portText, 10)
    if (!Number.isFinite(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      return undefined
    }

    return parsedPort
  }

  const isSubmittable = (): boolean => {
    return parsePort() !== undefined && formState.host.trim() !== '' && formState.username.trim() !== ''
  }

  const isDeviceKeyReady = !isDeviceKeyAuth || (deviceKey !== null && deviceKeyError === null)
  const isTestInProgress = props.status.kind === 'testing'
  const isActionDisabled = !isSubmittable() || isTestInProgress || !isDeviceKeyReady

  const buildDraft = (): ServerDraft | undefined => {
    const port = parsePort()
    if (port === undefined) {
      return undefined
    }

    return {
      authMethod,
      host: formState.host.trim(),
      label: formState.label.trim() || formState.host.trim(),
      passphrase: (isKeyAuth && formState.passphrase) || undefined,
      password: (isPasswordAuth && formState.password) || undefined,
      port,
      privateKey: (isKeyAuth && formState.privateKey) || undefined,
      rootPath: remotePathUtil.normalizeRootPath({ path: formState.rootPathText }),
      username: formState.username.trim(),
    }
  }

  const handleSubmit = (): void => {
    const draft = buildDraft()
    if (draft) {
      props.onSubmit(draft)
    }
  }

  const handleTest = (): void => {
    const draft = buildDraft()
    if (draft) {
      props.onTest(draft)
    }
  }

  const handleBrowsePress = (): void => {
    setBrowseDraft(buildDraft())
  }

  const closeBrowse = (): void => {
    setBrowseDraft(undefined)
  }

  const handleBrowseSelect = (path: string): void => {
    updateField({ rootPathText: path })
    closeBrowse()
  }

  const handleAuthenticatePress = (): void => {
    const draft = buildDraft()
    if (!draft) {
      return
    }
    props.onInstallStart(draft)
    setInstallDraft(draft)
  }

  const closeInstall = (): void => {
    setInstallDraft(undefined)
    props.onInstallEnd()
  }

  const handleInstallComplete = (draft: ServerDraft): void => {
    closeInstall()
    props.onTest(draft)
  }

  const renderDeviceKeyStatus = (): JSX.Element | null => {
    if (deviceKeyError !== null) {
      return (
        <Text style={[styles.deviceKeyHint, { color: md3Theme.colors.error }]}>
          {`Device key unavailable: ${deviceKeyError}`}
        </Text>
      )
    }
    if (deviceKey !== null) {
      return (
        <Text numberOfLines={1} style={[styles.deviceKeyHint, { color: md3Theme.colors.onSurfaceVariant }]}>
          {`Signing in with ${deviceKey.comment}`}
        </Text>
      )
    }

    return (
      <Text style={[styles.deviceKeyHint, { color: md3Theme.colors.onSurfaceVariant }]}>
        No device key yet - generate one in Settings, then authenticate it with this server.
      </Text>
    )
  }

  const renderStatus = (): JSX.Element | null => {
    switch (props.status.kind) {
      case 'failed': {
        return (
          <HelperText padding="none" type="error" visible>
            {props.status.message}
          </HelperText>
        )
      }
      case 'idle': {
        return null
      }
      case 'succeeded': {
        return <Text style={[styles.statusMessage, { color: md3Theme.colors.primary }]}>Connection successful</Text>
      }
      case 'testing': {
        return <Text style={[styles.statusMessage, { color: md3Theme.colors.onBackground }]}>Testing connection…</Text>
      }
    }
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
            label="Label"
            mode="outlined"
            onChangeText={(text) => {
              updateField({ label: text })
            }}
            placeholder="My build box"
            value={formState.label}
          />

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            label="Host"
            mode="outlined"
            onChangeText={(text) => {
              updateField({ host: text })
            }}
            placeholder="203.0.113.10"
            value={formState.host}
          />

          <View style={styles.rowFields}>
            <View style={styles.rowField}>
              <TextInput
                keyboardType="number-pad"
                label="Port"
                mode="outlined"
                onChangeText={(text) => {
                  updateField({ portText: text })
                }}
                placeholder="22"
                value={formState.portText}
              />
            </View>
            <View style={styles.rowField}>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                label="Username"
                mode="outlined"
                onChangeText={(text) => {
                  updateField({ username: text })
                }}
                placeholder="deploy"
                value={formState.username}
              />
            </View>
          </View>

          <View style={styles.rootPathRow}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              label="Root Folder"
              mode="outlined"
              onChangeText={(text) => {
                updateField({ rootPathText: text })
              }}
              placeholder={EMPTY_PATH}
              style={styles.rootPathInput}
              value={formState.rootPathText}
            />
            <IconButton
              disabled={!isSubmittable()}
              icon="folder-outline"
              iconColor={md3Theme.colors.onSurfaceVariant}
              onPress={handleBrowsePress}
              tip="Browse remote folders"
            />
          </View>

          <SegmentedButtons
            buttons={AUTH_METHOD_BUTTONS}
            onValueChange={(value) => {
              setAuthMethod(value)
            }}
            style={styles.authButtons}
            value={authMethod}
          />

          {isPasswordAuth && (
            <View>
              <TextInput
                label="Password"
                mode="outlined"
                onChangeText={(text) => {
                  updateField({ password: text })
                }}
                placeholder={passwordPlaceholder()}
                secureTextEntry
                value={formState.password}
              />
            </View>
          )}

          {isKeyAuth && (
            <View>
              <TextInput
                label="Private Key"
                mode="outlined"
                multiline
                onChangeText={(text) => {
                  updateField({ privateKey: text })
                }}
                placeholder="Paste an OpenSSH private key"
                style={styles.keyInput}
                value={formState.privateKey}
              />
              <TextInput
                label="Passphrase"
                mode="outlined"
                onChangeText={(text) => {
                  updateField({ passphrase: text })
                }}
                placeholder="Leave blank if the key has none"
                secureTextEntry
                value={formState.passphrase}
              />
            </View>
          )}

          {isDeviceKeyAuth && (
            <View style={styles.deviceKeySection}>
              {renderDeviceKeyStatus()}
              <Button
                disabled={isActionDisabled}
                mode="contained-tonal"
                onPress={handleAuthenticatePress}
                style={styles.authenticateButton}
              >
                Authenticate Device Key with Server
              </Button>
            </View>
          )}

          <Button
            disabled={isActionDisabled}
            loading={isTestInProgress}
            mode="contained-tonal"
            onPress={handleTest}
            style={styles.testButton}
          >
            Test Connection
          </Button>
          {renderStatus()}
          <View style={styles.buttonRow}>
            <Button mode="outlined" onPress={props.onCancel} style={styles.rowButton}>
              Cancel
            </Button>
            <Button disabled={isActionDisabled} mode="contained" onPress={handleSubmit} style={styles.rowButton}>
              Save
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingArea>
      <FolderBrowserModal
        draft={browseDraft}
        existingConfig={props.editingConfig}
        initialPath={formState.rootPathText || EMPTY_PATH}
        isVisible={browseDraft !== undefined}
        onCancel={closeBrowse}
        onSelect={handleBrowseSelect}
      />
      <DeviceKeyInstallModal
        draft={installDraft}
        existingConfig={props.editingConfig}
        isVisible={installDraft !== undefined}
        onCancel={closeInstall}
        onInstalled={handleInstallComplete}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  authButtons: {
    marginTop: 4,
  },
  authenticateButton: {
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  deviceKeyHint: {
    fontSize: 13,
  },
  deviceKeySection: {
    gap: 8,
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
  keyInput: {
    fontFamily: 'jetBrainsMonoRegular',
    minHeight: 120,
  },
  modalScroll: {
    flex: 1,
  },
  rootPathInput: {
    flex: 1,
  },
  rootPathRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  rowButton: {
    flex: 1,
  },
  rowField: {
    flex: 1,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  statusMessage: {
    fontSize: 13,
    marginTop: 12,
  },
  testButton: {
    marginTop: 12,
  },
})
