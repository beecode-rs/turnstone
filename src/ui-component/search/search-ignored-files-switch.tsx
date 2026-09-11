import { type JSX } from 'react'
import { Switch } from 'react-native-paper'

import { useSearchIgnoredFiles } from '#src/ui-component/search/search-ignored-files-context'

export const SearchIgnoredFilesSwitch = (): JSX.Element => {
  const { isSearchIgnoredFilesIncluded, saveIsSearchIgnoredFilesIncluded } = useSearchIgnoredFiles()

  return (
    <Switch
      onValueChange={(nextValue) => {
        void saveIsSearchIgnoredFilesIncluded(nextValue)
      }}
      value={isSearchIgnoredFilesIncluded}
    />
  )
}
