import { type JSX } from 'react'
import { Switch } from 'react-native-paper'

import { useLineNumbers } from '#src/ui-component/code-viewer/line-numbers-context'

export const LineNumbersSwitch = (): JSX.Element => {
  const { isLineNumbersHidden, saveIsLineNumbersHidden } = useLineNumbers()

  return (
    <Switch
      onValueChange={(nextValue) => {
        void saveIsLineNumbersHidden(nextValue)
      }}
      value={isLineNumbersHidden}
    />
  )
}
