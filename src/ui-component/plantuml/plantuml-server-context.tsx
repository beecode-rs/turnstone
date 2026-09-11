import { type JSX, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'

import { type PlantumlServerPreference } from '#src/business/model/plantuml-server-preference'
import { PlantumlServerPreferenceService } from '#src/business/service/plantuml-server-preference-service'
import { plantumlServerPreferenceStorage } from '#src/lib/async-storage'
import { constant } from '#src/util/constant'

interface PlantumlServerContextValue {
  effectiveServerUrl: string
  plantumlServer: PlantumlServerPreference
  savePlantumlServer: (plantumlServer: PlantumlServerPreference) => Promise<void>
}

const PlantumlServerContext = createContext<PlantumlServerContextValue | undefined>(undefined)

export const PlantumlServerProvider = (props: { children: ReactNode }): JSX.Element => {
  const [plantumlServer, setPlantumlServer] = useState<PlantumlServerPreference>(
    constant.plantumlServer.defaultPreference,
  )
  const plantumlServerPreferenceService = useMemo(() => {
    return new PlantumlServerPreferenceService()
  }, [])

  useEffect(() => {
    void plantumlServerPreferenceService
      .loadPreference({ storage: plantumlServerPreferenceStorage })
      .then((loadedPreference) => {
        setPlantumlServer(loadedPreference)
      })
  }, [plantumlServerPreferenceService])

  const effectiveServerUrl = useMemo(() => {
    if (!plantumlServer.isCustomServerEnabled) {
      return constant.plantuml.defaultServerUrl
    }

    return plantumlServer.customServerUrl
  }, [plantumlServer])

  const contextValue = useMemo(() => {
    return {
      effectiveServerUrl,
      plantumlServer,
      savePlantumlServer: (nextPlantumlServer: PlantumlServerPreference) => {
        return plantumlServerPreferenceService
          .savePreference({ preference: nextPlantumlServer, storage: plantumlServerPreferenceStorage })
          .then(() => {
            setPlantumlServer(nextPlantumlServer)
          })
      },
    }
  }, [effectiveServerUrl, plantumlServer, plantumlServerPreferenceService])

  return <PlantumlServerContext.Provider value={contextValue}>{props.children}</PlantumlServerContext.Provider>
}

export const usePlantumlServer = (): PlantumlServerContextValue => {
  const contextValue = useContext(PlantumlServerContext)

  if (!contextValue) {
    throw new Error('usePlantumlServer requires PlantumlServerProvider')
  }

  return contextValue
}
