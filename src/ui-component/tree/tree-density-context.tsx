import { type JSX, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'

import { TreeDensityPreferenceMapper } from '#src/business/enum/tree-density-preference-mapper-enum'
import { TreeDensityPreferenceService } from '#src/business/service/tree-density-preference-service'
import { treeDensityPreferenceStorage } from '#src/lib/async-storage'

interface TreeDensityContextValue {
  density: TreeDensityPreferenceMapper
  saveDensity: (density: TreeDensityPreferenceMapper) => Promise<void>
}

const TreeDensityContext = createContext<TreeDensityContextValue | undefined>(undefined)

export const TreeDensityProvider = (props: { children: ReactNode }): JSX.Element => {
  const [density, setDensity] = useState<TreeDensityPreferenceMapper>(TreeDensityPreferenceMapper.DEFAULT)
  const treeDensityPreferenceService = useMemo(() => {
    return new TreeDensityPreferenceService()
  }, [])

  useEffect(() => {
    void treeDensityPreferenceService
      .loadPreference({ storage: treeDensityPreferenceStorage })
      .then((loadedDensity) => {
        setDensity(loadedDensity)
      })
  }, [treeDensityPreferenceService])

  const contextValue = useMemo(() => {
    return {
      density,
      saveDensity: (nextDensity: TreeDensityPreferenceMapper) => {
        return treeDensityPreferenceService
          .savePreference({ density: nextDensity, storage: treeDensityPreferenceStorage })
          .then(() => {
            setDensity(nextDensity)
          })
      },
    }
  }, [density, treeDensityPreferenceService])

  return <TreeDensityContext.Provider value={contextValue}>{props.children}</TreeDensityContext.Provider>
}

export const useTreeDensity = (): TreeDensityContextValue => {
  const contextValue = useContext(TreeDensityContext)

  if (!contextValue) {
    throw new Error('useTreeDensity requires TreeDensityProvider')
  }

  return contextValue
}
