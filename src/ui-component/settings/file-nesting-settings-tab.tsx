import { type JSX } from 'react'

import { FileNestingPatterns } from '#src/ui-component/settings/file-nesting-patterns'
import { SettingsRow } from '#src/ui-component/settings/settings-row'
import { SettingsSection } from '#src/ui-component/settings/settings-section'
import { FileNestingSwitch } from '#src/ui-component/tree/file-nesting-switch'

export const FileNestingSettingsTab = (): JSX.Element => {
  return (
    <SettingsSection>
      <SettingsRow
        control={<FileNestingSwitch />}
        description="Group related files under their parent, like file.test.ts under file.ts"
        label="Nest similar files"
      />
      <FileNestingPatterns />
    </SettingsSection>
  )
}
