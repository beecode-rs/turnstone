import { useEffect, useMemo, useState } from 'react'

import { insecureFetch } from '#src/lib/insecure-fetch'
import { usePlantumlServer } from '#src/ui-component/plantuml/plantuml-server-context'
import { plantumlUrlUtil } from '#src/util/plantuml-url-util'

const DIAGRAM_DATA_URI_CACHE_MAX_ENTRIES = 10
const PLANTUML_PNG_DATA_URI_PREFIX = 'data:image/png;base64,'

const diagramDataUriCache = new Map<string, Promise<string | null>>()

const evictOldestDiagramDataUri = (): void => {
  const oldestKey = diagramDataUriCache.keys().next().value
  if (oldestKey !== undefined) {
    diagramDataUriCache.delete(oldestKey)
  }
}

const loadCachedDataUri = (params: { diagramUrl: string }): Promise<string | null> => {
  const cachedDataUri = diagramDataUriCache.get(params.diagramUrl)
  if (cachedDataUri !== undefined) {
    return cachedDataUri
  }
  if (diagramDataUriCache.size >= DIAGRAM_DATA_URI_CACHE_MAX_ENTRIES) {
    evictOldestDiagramDataUri()
  }
  const dataUri = insecureFetch
    .loadBase64({ url: params.diagramUrl })
    .then((base64) => {
      return `${PLANTUML_PNG_DATA_URI_PREFIX}${base64}`
    })
    .catch(() => {
      return null
    })
  diagramDataUriCache.set(params.diagramUrl, dataUri)

  return dataUri
}

const resolveDiagramSource = (params: {
  dataUri: string | undefined
  diagramUrl: string
  isTlsVerificationSkipped: boolean
}): string | undefined => {
  if (params.isTlsVerificationSkipped) {
    return params.dataUri
  }

  return params.diagramUrl
}

export const usePlantumlDiagramSource = (params: {
  source: string
}): { diagramSource: string | undefined; isDiagramUnavailable: boolean } => {
  const { effectiveServerUrl, plantumlServer } = usePlantumlServer()
  const [dataUri, setDataUri] = useState<string | undefined>(undefined)
  const [isDiagramUnavailable, setIsDiagramUnavailable] = useState(false)

  const diagramUrl = useMemo(() => {
    return plantumlUrlUtil.resolveDiagramUrl({ serverUrl: effectiveServerUrl, source: params.source })
  }, [effectiveServerUrl, params.source])

  const isTlsVerificationSkipped =
    plantumlServer.isCustomServerEnabled &&
    plantumlServer.isSelfSignedCertificateIgnored &&
    effectiveServerUrl.startsWith('https://') &&
    insecureFetch.isCertificateBypassSupported

  useEffect(() => {
    setDataUri(undefined)
    setIsDiagramUnavailable(false)
    if (!isTlsVerificationSkipped) {
      return undefined
    }
    const cancelState = { isCancelled: false }
    void loadCachedDataUri({ diagramUrl }).then((nextDataUri) => {
      if (cancelState.isCancelled) {
        return
      }
      if (nextDataUri === null) {
        setIsDiagramUnavailable(true)

        return
      }
      setDataUri(nextDataUri)
    })

    return () => {
      cancelState.isCancelled = true
    }
  }, [diagramUrl, isTlsVerificationSkipped])

  const diagramSource = resolveDiagramSource({ dataUri, diagramUrl, isTlsVerificationSkipped })

  return { diagramSource, isDiagramUnavailable }
}
