import { type JSX } from 'react'
import { Switch } from 'react-native-paper'

import { useIgnoredFiles } from '#src/ui-component/tree/ignored-files-context'

export const IgnoredFilesSwitch = (): JSX.Element => {
  const { isIgnoredFilesHidden, saveIsIgnoredFilesHidden } = useIgnoredFiles()

  return (
    <Switch
      onValueChange={(nextValue) => {
        void saveIsIgnoredFilesHidden(nextValue)
      }}
      value={isIgnoredFilesHidden}
    />
  )
}
