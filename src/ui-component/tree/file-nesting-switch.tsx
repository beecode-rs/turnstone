import { type JSX } from 'react'
import { Switch } from 'react-native-paper'

import { useFileNesting } from '#src/ui-component/tree/file-nesting-context'

export const FileNestingSwitch = (): JSX.Element => {
  const { fileNesting, saveFileNesting } = useFileNesting()

  return (
    <Switch
      onValueChange={(nextValue) => {
        void saveFileNesting({ ...fileNesting, isEnabled: nextValue })
      }}
      value={fileNesting.isEnabled}
    />
  )
}
