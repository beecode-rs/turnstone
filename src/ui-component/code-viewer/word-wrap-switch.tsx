import { type JSX } from 'react'
import { Switch } from 'react-native-paper'

import { useWordWrap } from '#src/ui-component/code-viewer/word-wrap-context'

export const WordWrapSwitch = (): JSX.Element => {
  const { isWordWrapEnabled, saveIsWordWrapEnabled } = useWordWrap()

  return (
    <Switch
      onValueChange={(nextValue) => {
        void saveIsWordWrapEnabled(nextValue)
      }}
      value={isWordWrapEnabled}
    />
  )
}
