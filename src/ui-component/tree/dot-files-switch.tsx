import { type JSX } from 'react'
import { Switch } from 'react-native-paper'

import { useDotFiles } from '#src/ui-component/tree/dot-files-context'

export const DotFilesSwitch = (): JSX.Element => {
  const { isDotFilesHidden, saveIsDotFilesHidden } = useDotFiles()

  return (
    <Switch
      onValueChange={(nextValue) => {
        void saveIsDotFilesHidden(nextValue)
      }}
      value={isDotFilesHidden}
    />
  )
}
