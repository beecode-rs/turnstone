import { type JSX } from 'react'
import { IconButton as PaperIconButton } from 'react-native-paper'

export type IconButtonProps = {
  disabled?: boolean
  icon: string
  iconColor?: string
  onPress: () => void
  size?: number
  tip: string
}

export const IconButton = (props: IconButtonProps): JSX.Element => {
  return (
    <PaperIconButton
      accessibilityLabel={props.tip}
      disabled={props.disabled}
      icon={props.icon}
      iconColor={props.iconColor}
      onPress={props.onPress}
      size={props.size}
    />
  )
}
