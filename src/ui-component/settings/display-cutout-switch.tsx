import { type JSX } from 'react'
import { Switch } from 'react-native-paper'

import { useDisplayCutout } from '#src/ui-component/display-cutout-context'

export const DisplayCutoutSwitch = (): JSX.Element => {
  const { isContentBehindCutout, saveIsContentBehindCutout } = useDisplayCutout()

  return (
    <Switch
      onValueChange={(nextValue) => {
        void saveIsContentBehindCutout(nextValue)
      }}
      value={isContentBehindCutout}
    />
  )
}
