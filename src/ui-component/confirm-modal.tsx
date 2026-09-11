import { type JSX } from 'react'
import { Button, Dialog, Portal, Text } from 'react-native-paper'

import { useThemePreference } from '#src/ui-component/theme/theme-context'

interface ConfirmModalProps {
  confirmLabel: string
  isDestructive?: boolean
  isVisible: boolean
  message: string
  onCancel: () => void
  onConfirm: () => void
  title: string
}

export const ConfirmModal = (props: ConfirmModalProps): JSX.Element => {
  const { md3Theme } = useThemePreference()

  const resolveConfirmTextColor = (): string => {
    if (props.isDestructive) {
      return md3Theme.colors.error
    }

    return md3Theme.colors.primary
  }

  return (
    <Portal>
      <Dialog onDismiss={props.onCancel} visible={props.isVisible}>
        <Dialog.Title>{props.title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{props.message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={props.onCancel}>Cancel</Button>
          <Button onPress={props.onConfirm} textColor={resolveConfirmTextColor()}>
            {props.confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}
