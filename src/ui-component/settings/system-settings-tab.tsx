import { type JSX } from 'react'

import { DisplayCutoutSwitch } from '#src/ui-component/settings/display-cutout-switch'
import { FabOpacityMenu } from '#src/ui-component/settings/fab-opacity-menu'
import { FooterSwitch } from '#src/ui-component/settings/footer-switch'
import { SettingsRow } from '#src/ui-component/settings/settings-row'
import { SettingsSection } from '#src/ui-component/settings/settings-section'
import { ThemeSchemeMenu } from '#src/ui-component/theme/theme-scheme-menu'
import { ThemeStyleMenu } from '#src/ui-component/theme/theme-style-menu'

export const SystemSettingsTab = (): JSX.Element => {
  return (
    <SettingsSection>
      <SettingsRow
        control={<ThemeStyleMenu />}
        description="Paper for color screens, E-ink for e-readers"
        label="Device type"
      />
      <SettingsRow control={<ThemeSchemeMenu />} description="Auto follows your system setting" label="Color scheme" />
      <SettingsRow
        control={<FabOpacityMenu />}
        description="How see-through the floating show-menu button is"
        label="Floating button opacity"
      />
      <SettingsRow
        control={<DisplayCutoutSwitch />}
        description="Content may be partially hidden by the camera cutout"
        label="Draw content behind camera cutout"
      />
      <SettingsRow
        control={<FooterSwitch />}
        description="Bottom bar showing the branch and open file"
        label="Hide footer"
      />
    </SettingsSection>
  )
}
