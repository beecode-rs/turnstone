import { type JSX } from 'react'

import { AlwaysOpenDrawerSwitch } from '#src/ui-component/open-screens/always-open-drawer-switch'
import { SettingsRow } from '#src/ui-component/settings/settings-row'
import { SettingsSection } from '#src/ui-component/settings/settings-section'
import { TreeDensityMenu } from '#src/ui-component/tree/tree-density-menu'

export const TreeViewSettingsTab = (): JSX.Element => {
  return (
    <SettingsSection>
      <SettingsRow control={<TreeDensityMenu />} description="Row spacing in the file tree" label="Tree density" />
      <SettingsRow
        control={<AlwaysOpenDrawerSwitch />}
        description="Keep the open screens drawer pinned open beside the tree"
        label="Always open drawer"
      />
    </SettingsSection>
  )
}
