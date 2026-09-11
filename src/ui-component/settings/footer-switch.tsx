import { type JSX } from 'react'
import { Switch } from 'react-native-paper'

import { useFooter } from '#src/ui-component/footer-context'

export const FooterSwitch = (): JSX.Element => {
  const { isFooterHidden, saveIsFooterHidden } = useFooter()

  return (
    <Switch
      onValueChange={(nextValue) => {
        void saveIsFooterHidden(nextValue)
      }}
      value={isFooterHidden}
    />
  )
}
