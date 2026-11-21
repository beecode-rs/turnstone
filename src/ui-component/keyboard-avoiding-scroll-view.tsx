import { type JSX, type ReactNode } from 'react'
import { type StyleProp, type ViewStyle } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'

export const KeyboardAvoidingScrollView = (props: {
  children: ReactNode
  contentContainerStyle?: StyleProp<ViewStyle>
  style?: StyleProp<ViewStyle>
}): JSX.Element => {
  const { children, contentContainerStyle, style } = props

  return (
    <KeyboardAwareScrollView bottomOffset={16} contentContainerStyle={contentContainerStyle} style={style}>
      {children}
    </KeyboardAwareScrollView>
  )
}
