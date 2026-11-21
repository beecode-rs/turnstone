import { useEffect, useMemo, useState } from 'react'

import { insecureFetch } from '#src/lib/insecure-fetch'
import { usePlantumlServer } from '#src/ui-component/plantuml/plantuml-server-context'
import { constant } from '#src/util/constant'
import { plantumlUrlUtil } from '#src/util/plantuml-url-util'

export type PlantumlDiagramResult =
  | { kind: 'pending' }
  | { kind: 'image'; source: string }
  | { kind: 'invalid-source'; source: string }
  | { kind: 'server-error' }
  | { kind: 'unreachable' }

const diagramResultCache = new Map<string, Promise<PlantumlDiagramResult>>()

const evictOldestDiagramResult = (): void => {
  const oldestKey = diagramResultCache.keys().next().value
  if (oldestKey !== undefined) {
    diagramResultCache.delete(oldestKey)
  }
}

const resolveCacheKey = (params: { diagramUrl: string; isTlsVerificationSkipped: boolean }): string => {
  const { diagramUrl, isTlsVerificationSkipped } = params
  if (isTlsVerificationSkipped) {
    return `skip-tls-verify:${diagramUrl}`
  }

  return `verify-tls:${diagramUrl}`
}

const resolveStatusResult = (params: { base64: string; status: number }): PlantumlDiagramResult => {
  const { base64, status } = params
  if (status >= 200 && status < 300) {
    return { kind: 'image', source: plantumlUrlUtil.resolveDiagramDataUri({ base64 }) }
  }
  if (status === 400) {
    return { kind: 'invalid-source', source: plantumlUrlUtil.resolveDiagramDataUri({ base64 }) }
  }

  return { kind: 'server-error' }
}

const loadCachedDiagramResult = (params: {
  diagramUrl: string
  isTlsVerificationSkipped: boolean
}): Promise<PlantumlDiagramResult> => {
  const cacheKey = resolveCacheKey(params)
  const cachedResult = diagramResultCache.get(cacheKey)
  if (cachedResult !== undefined) {
    return cachedResult
  }
  if (diagramResultCache.size >= constant.plantuml.diagramCacheMaxEntries) {
    evictOldestDiagramResult()
  }
  const result = insecureFetch
    .loadBase64Response({ isTlsVerificationSkipped: params.isTlsVerificationSkipped, url: params.diagramUrl })
    .then((response) => {
      return resolveStatusResult({ base64: response.base64, status: response.status })
    })
    .catch((): PlantumlDiagramResult => {
      return { kind: 'unreachable' }
    })
  diagramResultCache.set(cacheKey, result)

  return result
}

export const usePlantumlDiagramSource = (params: { source: string }): { result: PlantumlDiagramResult } => {
  const { effectiveServerUrl, plantumlServer } = usePlantumlServer()
  const [fetchedResult, setFetchedResult] = useState<PlantumlDiagramResult>({ kind: 'pending' })

  const diagramUrl = useMemo(() => {
    return plantumlUrlUtil.resolveDiagramUrl({ serverUrl: effectiveServerUrl, source: params.source })
  }, [effectiveServerUrl, params.source])

  const isTlsVerificationSkipped =
    plantumlServer.isCustomServerEnabled &&
    plantumlServer.isSelfSignedCertificateIgnored &&
    effectiveServerUrl.startsWith('https://') &&
    insecureFetch.isCertificateBypassSupported
  const isDirectUrlMode = !insecureFetch.isBase64FetchSupported

  useEffect(() => {
    setFetchedResult({ kind: 'pending' })
    if (isDirectUrlMode || params.source === '') {
      return undefined
    }
    const cancelState = { isCancelled: false }
    void loadCachedDiagramResult({ diagramUrl, isTlsVerificationSkipped }).then((nextResult) => {
      if (cancelState.isCancelled) {
        return
      }
      setFetchedResult(nextResult)
    })

    return () => {
      cancelState.isCancelled = true
    }
  }, [diagramUrl, isDirectUrlMode, isTlsVerificationSkipped, params.source])

  const result = useMemo<PlantumlDiagramResult>(() => {
    if (!isDirectUrlMode) {
      return fetchedResult
    }
    if (params.source === '') {
      return { kind: 'pending' }
    }

    return { kind: 'image', source: diagramUrl }
  }, [diagramUrl, fetchedResult, isDirectUrlMode, params.source])

  return { result }
}
