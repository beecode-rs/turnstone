import { type JSX, type ReactNode } from 'react'
import { type StyleProp, type ViewStyle } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'

export const KeyboardAvoidingArea = (props: { children: ReactNode; style?: StyleProp<ViewStyle> }): JSX.Element => {
  return (
    <KeyboardAvoidingView behavior="padding" style={props.style}>
      {props.children}
    </KeyboardAvoidingView>
  )
}
