import { useEffect, useState } from 'react'

import { MarkdownImageService } from '#src/business/service/markdown-image-service'
import { serverConnectUseCase } from '#src/business/use-case/server-connect-use-case'

const REMOTE_SOURCE_CACHE_MAX_ENTRIES = 30

const remoteSourceCache = new Map<string, Promise<string | null>>()

const resolveDirectSource = (params: { src: string }): string | null => {
  if (params.src.startsWith('http')) {
    return params.src
  }
  if (params.src.startsWith('data:')) {
    return params.src
  }

  return null
}

const evictOldestRemoteSource = (): void => {
  const oldestKey = remoteSourceCache.keys().next().value
  if (oldestKey !== undefined) {
    remoteSourceCache.delete(oldestKey)
  }
}

const loadRemoteSource = (params: { hostId: string; markdownPath: string; src: string }): Promise<string | null> => {
  const cacheKey = `${params.hostId}\n${params.markdownPath}\n${params.src}`
  const cachedSource = remoteSourceCache.get(cacheKey)
  if (cachedSource !== undefined) {
    return cachedSource
  }
  if (remoteSourceCache.size >= REMOTE_SOURCE_CACHE_MAX_ENTRIES) {
    evictOldestRemoteSource()
  }
  const remoteSource = serverConnectUseCase
    .getTransport({ hostId: params.hostId })
    .then((transport) => {
      return new MarkdownImageService().loadDataUri({
        markdownPath: params.markdownPath,
        src: params.src,
        transport,
      })
    })
    .catch(() => {
      return null
    })
  remoteSourceCache.set(cacheKey, remoteSource)

  return remoteSource
}

export const useMarkdownImageSource = (params: {
  hostId: string
  markdownPath: string
  src: string
}): string | null => {
  const [source, setSource] = useState<string | null>(() => {
    return resolveDirectSource({ src: params.src })
  })

  useEffect(() => {
    const directSource = resolveDirectSource({ src: params.src })
    if (directSource !== null) {
      setSource(directSource)

      return undefined
    }
    const cancelState = { isCancelled: false }
    void loadRemoteSource({ hostId: params.hostId, markdownPath: params.markdownPath, src: params.src }).then(
      (remoteSource) => {
        if (cancelState.isCancelled) {
          return
        }
        setSource(remoteSource)
      },
    )

    return () => {
      cancelState.isCancelled = true
    }
  }, [params.hostId, params.markdownPath, params.src])

  return source
}
