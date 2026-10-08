import { type JSX } from 'react'

import { BiometricLockSwitch } from '#src/ui-component/settings/biometric-lock-switch'
import { SettingsRow } from '#src/ui-component/settings/settings-row'
import { SettingsSection } from '#src/ui-component/settings/settings-section'

export const SecuritySettingsTab = (): JSX.Element => {
  return (
    <SettingsSection>
      <SettingsRow
        control={<BiometricLockSwitch />}
        description="Ask for fingerprint or face unlock when the app starts"
        label="Biometric lock"
      />
    </SettingsSection>
  )
}
