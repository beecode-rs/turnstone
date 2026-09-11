import { type JSX } from 'react'
import { Switch } from 'react-native-paper'

import { usePlantumlServer } from '#src/ui-component/plantuml/plantuml-server-context'

export const PlantumlSelfSignedSwitch = (): JSX.Element => {
  const { plantumlServer, savePlantumlServer } = usePlantumlServer()

  return (
    <Switch
      disabled={!plantumlServer.isCustomServerEnabled}
      onValueChange={(nextValue) => {
        void savePlantumlServer({ ...plantumlServer, isSelfSignedCertificateIgnored: nextValue })
      }}
      value={plantumlServer.isSelfSignedCertificateIgnored}
    />
  )
}
