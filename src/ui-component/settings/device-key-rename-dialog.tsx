import { type JSX } from 'react'
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper'

interface DeviceKeyRenameDialogProps {
  isVisible: boolean
  isBusy: boolean
  name: string
  onCancel: () => void
  onConfirm: () => void
  onNameChange: (value: string) => void
}

export const DeviceKeyRenameDialog = (props: DeviceKeyRenameDialogProps): JSX.Element => {
  const isConfirmDisabled = props.isBusy || props.name.trim() === ''

  return (
    <Portal>
      <Dialog onDismiss={props.onCancel} visible={props.isVisible}>
        <Dialog.Title>Rename device key</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodySmall">This is the name servers show for this key in authorized_keys.</Text>
          <TextInput
            autoFocus
            onChangeText={props.onNameChange}
            placeholder="turnstone-beecode@my-phone-android"
            value={props.name}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={props.onCancel}>Cancel</Button>
          <Button disabled={isConfirmDisabled} onPress={props.onConfirm}>
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}
