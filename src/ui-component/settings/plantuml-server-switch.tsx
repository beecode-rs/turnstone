import { type JSX } from 'react'
import { Switch } from 'react-native-paper'

import { usePlantumlServer } from '#src/ui-component/plantuml/plantuml-server-context'

export const PlantumlServerSwitch = (): JSX.Element => {
  const { plantumlServer, savePlantumlServer } = usePlantumlServer()

  return (
    <Switch
      onValueChange={(nextValue) => {
        void savePlantumlServer({ ...plantumlServer, isCustomServerEnabled: nextValue })
      }}
      value={plantumlServer.isCustomServerEnabled}
    />
  )
}
