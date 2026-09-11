import { type JSX } from 'react'
import { Switch } from 'react-native-paper'

import { useAlwaysOpenDrawer } from '#src/ui-component/open-screens/always-open-drawer-context'

export const AlwaysOpenDrawerSwitch = (): JSX.Element => {
  const { isAlwaysOpenDrawer, saveIsAlwaysOpenDrawer } = useAlwaysOpenDrawer()

  return (
    <Switch
      onValueChange={(nextValue) => {
        void saveIsAlwaysOpenDrawer(nextValue)
      }}
      value={isAlwaysOpenDrawer}
    />
  )
}
