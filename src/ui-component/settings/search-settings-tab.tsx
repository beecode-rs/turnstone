import { type JSX } from 'react'

import { SearchIgnoredFilesSwitch } from '#src/ui-component/search/search-ignored-files-switch'
import { SettingsRow } from '#src/ui-component/settings/settings-row'
import { SettingsSection } from '#src/ui-component/settings/settings-section'

export const SearchSettingsTab = (): JSX.Element => {
  return (
    <SettingsSection>
      <SettingsRow
        control={<SearchIgnoredFilesSwitch />}
        description="Include files matched by .gitignore patterns in search results"
        label="Search ignored files"
      />
    </SettingsSection>
  )
}
