import * as Clipboard from 'expo-clipboard'
import { type JSX, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'

import { ConfirmKindMapper } from '#src/business/enum/confirm-kind-mapper-enum'
import { type DeviceKeyPublicInfo } from '#src/business/model/device-key'
import { deviceKeyUseCase } from '#src/business/use-case/device-key-use-case'
import { ConfirmModal } from '#src/ui-component/confirm-modal'
import { DeviceKeyRenameDialog } from '#src/ui-component/settings/device-key-rename-dialog'
import { SettingsSection } from '#src/ui-component/settings/settings-section'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

const CONFIRM_CONTENT: Record<ConfirmKindMapper, { confirmLabel: string; message: string; title: string }> = {
  [ConfirmKindMapper.GENERATE]: {
    confirmLabel: 'Generate',
    message:
      'The current device key will be replaced. Servers that trust it will stop accepting this device until the new key is installed.',
    title: 'Generate new key',
  },
  [ConfirmKindMapper.REMOVE]: {
    confirmLabel: 'Remove',
    message: 'The device key will be deleted from this device. Servers that trust it will stop accepting this device.',
    title: 'Remove device key',
  },
}

export const SshKeySettingsTab = (): JSX.Element => {
  const { md3Theme } = useThemePreference()
  const [confirmKind, setConfirmKind] = useState<ConfirmKindMapper | null>(null)
  const [deviceKey, setDeviceKey] = useState<DeviceKeyPublicInfo | null>(null)
  const [deviceKeyError, setDeviceKeyError] = useState<string | null>(null)
  const [hasCopied, setHasCopied] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [isRenameDialogVisible, setIsRenameDialogVisible] = useState(false)
  const [renameText, setRenameText] = useState('')

  useEffect(() => {
    const loadKey = async (): Promise<void> => {
      try {
        setDeviceKey(await deviceKeyUseCase.find())
        setDeviceKeyError(null)
      } catch (error) {
        setDeviceKeyError(toErrorMessage(error))
      }
    }
    void loadKey()
  }, [])

  const generateKey = async (): Promise<void> => {
    setIsBusy(true)
    try {
      setDeviceKey(await deviceKeyUseCase.regenerate())
      setDeviceKeyError(null)
      setHasCopied(false)
    } catch (error) {
      setDeviceKeyError(toErrorMessage(error))
    } finally {
      setIsBusy(false)
    }
  }

  const removeKey = async (): Promise<void> => {
    setIsBusy(true)
    try {
      await deviceKeyUseCase.remove()
      setDeviceKey(null)
      setDeviceKeyError(null)
      setHasCopied(false)
    } catch (error) {
      setDeviceKeyError(toErrorMessage(error))
    } finally {
      setIsBusy(false)
    }
  }

  const renameKey = async (): Promise<void> => {
    if (deviceKey === null) {
      return
    }
    setIsBusy(true)
    try {
      const renamed = await deviceKeyUseCase.rename({ comment: renameText })
      if (renamed !== null) {
        setDeviceKey(renamed)
      }
      setIsRenameDialogVisible(false)
      setDeviceKeyError(null)
    } catch (error) {
      setDeviceKeyError(toErrorMessage(error))
    } finally {
      setIsBusy(false)
    }
  }

  const handleConfirm = (): void => {
    const kind = confirmKind
    setConfirmKind(null)
    switch (kind) {
      case ConfirmKindMapper.GENERATE: {
        void generateKey()

        return
      }
      case ConfirmKindMapper.REMOVE: {
        void removeKey()

        return
      }
      default: {
        return
      }
    }
  }

  const handleGeneratePress = (): void => {
    if (deviceKey !== null) {
      setConfirmKind(ConfirmKindMapper.GENERATE)

      return
    }
    void generateKey()
  }

  const handleRemovePress = (): void => {
    setConfirmKind(ConfirmKindMapper.REMOVE)
  }

  const handleCopyPress = async (): Promise<void> => {
    if (deviceKey === null) {
      return
    }
    await Clipboard.setStringAsync(deviceKey.publicKey)
    setHasCopied(true)
  }

  const openRenameDialog = (): void => {
    setRenameText(deviceKey?.comment ?? '')
    setIsRenameDialogVisible(true)
  }

  const handleRenameCancel = (): void => {
    setIsRenameDialogVisible(false)
  }

  const generateButtonLabel = (): string => {
    if (deviceKey !== null) {
      return 'Generate New Key'
    }

    return 'Generate Device Key'
  }

  const toErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message
    }

    return String(error)
  }

  const renderKeyStatus = (): JSX.Element | null => {
    if (deviceKeyError !== null) {
      return (
        <Text style={{ color: md3Theme.colors.error }} variant="bodySmall">
          {`Device key unavailable: ${deviceKeyError}`}
        </Text>
      )
    }
    if (deviceKey === null) {
      return (
        <Text style={{ color: md3Theme.colors.onSurfaceVariant }} variant="bodySmall">
          No device key on this device yet.
        </Text>
      )
    }

    return null
  }

  const renderKeyDetails = (): JSX.Element | null => {
    if (deviceKey === null) {
      return null
    }

    return (
      <View style={styles.details}>
        <Text numberOfLines={1} style={{ color: md3Theme.colors.onSurface }} variant="bodyLarge">
          {deviceKey.comment}
        </Text>
        <Text style={{ color: md3Theme.colors.onSurfaceVariant }} variant="bodySmall">
          {`Created ${new Date(deviceKey.createdAt).toLocaleString()}`}
        </Text>
        <Text selectable style={[styles.publicKey, { color: md3Theme.colors.onSurfaceVariant }]} variant="bodySmall">
          {deviceKey.publicKey}
        </Text>
      </View>
    )
  }

  return (
    <>
      <SettingsSection title="Device key">
        {renderKeyStatus()}
        {renderKeyDetails()}
        {hasCopied && (
          <Text style={{ color: md3Theme.colors.onSurfaceVariant }} variant="bodySmall">
            Public key copied to clipboard
          </Text>
        )}
        <View style={styles.actions}>
          {deviceKey !== null && (
            <Button disabled={isBusy} onPress={openRenameDialog}>
              Rename Key
            </Button>
          )}
          {deviceKey !== null && (
            <Button
              disabled={isBusy}
              onPress={() => {
                void handleCopyPress()
              }}
            >
              Copy Public Key
            </Button>
          )}
          <Button disabled={isBusy} mode="contained" onPress={handleGeneratePress}>
            {generateButtonLabel()}
          </Button>
          {deviceKey !== null && (
            <Button disabled={isBusy} onPress={handleRemovePress} textColor={md3Theme.colors.error}>
              Remove Key
            </Button>
          )}
        </View>
      </SettingsSection>
      <DeviceKeyRenameDialog
        isVisible={isRenameDialogVisible && deviceKey !== null}
        isBusy={isBusy}
        name={renameText}
        onCancel={handleRenameCancel}
        onConfirm={() => {
          void renameKey()
        }}
        onNameChange={setRenameText}
      />
      {confirmKind !== null && (
        <ConfirmModal
          confirmLabel={CONFIRM_CONTENT[confirmKind].confirmLabel}
          isDestructive
          isVisible
          message={CONFIRM_CONTENT[confirmKind].message}
          onCancel={() => {
            setConfirmKind(null)
          }}
          onConfirm={handleConfirm}
          title={CONFIRM_CONTENT[confirmKind].title}
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  details: {
    gap: 4,
  },
  publicKey: {
    fontFamily: 'jetBrainsMonoRegular',
    fontSize: 13,
  },
})
